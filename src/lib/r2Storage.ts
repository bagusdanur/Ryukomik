import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { allTargets, type R2Target } from "@/lib/r2Targets";

/**
 * Ada dua akun R2 (lihat r2Targets). File lama ada di akun utama, upload baru
 * di akun kedua, jadi operasi hapus/ukur harus menyentuh keduanya.
 */

export async function deleteR2Prefix(prefix: string): Promise<number> {
  let deleted = 0;

  for (const target of allTargets()) {
    let continuationToken: string | undefined;
    do {
      const list = await target.client.send(
        new ListObjectsV2Command({
          Bucket: target.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of list.Contents || []) {
        if (!obj.Key) continue;
        await target.client.send(new DeleteObjectCommand({ Bucket: target.bucket, Key: obj.Key }));
        deleted++;
      }

      continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  return deleted;
}

export async function deleteR2File(key: string): Promise<void> {
  for (const target of allTargets()) {
    try {
      await target.client.send(new DeleteObjectCommand({ Bucket: target.bucket, Key: key }));
    } catch (error) {
      console.error(`[r2Storage] Failed to delete file ${key} from ${target.id}:`, error);
    }
  }
}

/**
 * Kuota gratis R2: 10 GB-month penyimpanan per akun.
 * Cloudflare menghitung GB desimal (1 GB = 10^9 byte), bukan GiB — supaya angka
 * di dashboard kita sama dengan dashboard Cloudflare.
 */
export const R2_FREE_LIMIT_BYTES = 10 * 1000 ** 3;

export type R2BucketUsage = {
  id: R2Target["id"];
  bucket: string;
  publicBase: string;
  usedBytes: number;
  objectCount: number;
};

export type R2Usage = {
  usedBytes: number;
  objectCount: number;
  buckets: R2BucketUsage[];
  scannedAt: number;
};

let usageCache: { at: number; value: R2Usage } | null = null;
const USAGE_TTL_MS = 10 * 60 * 1000;

async function measure(target: R2Target): Promise<R2BucketUsage> {
  let usedBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const list = await target.client.send(
      new ListObjectsV2Command({
        Bucket: target.bucket,
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

  return {
    id: target.id,
    bucket: target.bucket,
    publicBase: target.publicBase,
    usedBytes,
    objectCount,
  };
}

/**
 * Pemakaian bucket dari daftar objek (ListObjectsV2). Tidak ada API "usage"
 * di S3/R2, jadi ukuran dijumlahkan dari listing — di-cache 10 menit supaya
 * tidak menembak Class A operations tiap render.
 */
export async function getR2Usage(force = false): Promise<R2Usage> {
  if (!force && usageCache && Date.now() - usageCache.at < USAGE_TTL_MS) {
    return usageCache.value;
  }

  const buckets = await Promise.all(allTargets().map(measure));
  const value: R2Usage = {
    usedBytes: buckets.reduce((sum, b) => sum + b.usedBytes, 0),
    objectCount: buckets.reduce((sum, b) => sum + b.objectCount, 0),
    buckets,
    scannedAt: Date.now(),
  };
  usageCache = { at: Date.now(), value };
  return value;
}
