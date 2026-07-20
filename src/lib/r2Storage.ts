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
