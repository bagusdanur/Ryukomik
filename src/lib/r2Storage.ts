import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "ryukomik-translate";

export async function deleteR2Prefix(prefix: string): Promise<number> {
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const list = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    if (list.Contents?.length) {
      for (const obj of list.Contents) {
        if (obj.Key) {
          await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
          deleted++;
        }
      }
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}

export async function deleteR2File(key: string): Promise<void> {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    console.error(`[r2Storage] Failed to delete file ${key}:`, error);
  }
}

/** Kuota gratis R2: 10 GB-month penyimpanan. */
export const R2_FREE_LIMIT_BYTES = 10 * 1024 ** 3;

export type R2Usage = {
  bucket: string;
  usedBytes: number;
  objectCount: number;
  scannedAt: number;
};

let usageCache: { at: number; value: R2Usage } | null = null;
const USAGE_TTL_MS = 10 * 60 * 1000;

/**
 * Pemakaian bucket dari daftar objek (ListObjectsV2). Tidak ada API "usage"
 * di S3/R2, jadi ukuran dijumlahkan dari listing — di-cache 10 menit supaya
 * tidak menembak Class A operations tiap render.
 */
export async function getR2Usage(force = false): Promise<R2Usage> {
  if (!force && usageCache && Date.now() - usageCache.at < USAGE_TTL_MS) {
    return usageCache.value;
  }

  let usedBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const list = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );
    for (const obj of list.Contents || []) {
      usedBytes += Number(obj.Size) || 0;
      objectCount += 1;
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  const value: R2Usage = { bucket: BUCKET, usedBytes, objectCount, scannedAt: Date.now() };
  usageCache = { at: Date.now(), value };
  return value;
}
