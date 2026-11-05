import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { targetById } from "@/lib/r2Targets";

/** Kuota penyimpanan per Scanlator: 2 GB (bisa dioverride lewat env untuk uji). */
export const SCANLATOR_QUOTA_BYTES = Number(process.env.SCANLATOR_QUOTA_BYTES) || 2 * 1024 * 1024 * 1024;

export type QuotaUsage = {
  usedBytes: number;
  limitBytes: number;
  fileCount: number;
};

/**
 * Hitung pemakaian storage satu Scanlator dari prefix R2 `scanlator/<handle>/`.
 * Dipakai untuk menolak upload yang melewati kuota dan untuk indikator di studio.
 */
export async function getScanlatorUsage(handle: string): Promise<QuotaUsage> {
  const target = targetById(undefined);
  const prefix = `scanlator/${handle}/`;
  let usedBytes = 0;
  let fileCount = 0;
  let token: string | undefined;

  try {
    do {
      const page = await target.client.send(
        new ListObjectsV2Command({
          Bucket: target.bucket,
          Prefix: prefix,
          ContinuationToken: token,
          MaxKeys: 1000,
        }),
      );
      for (const item of page.Contents || []) {
        usedBytes += Number(item.Size || 0);
        fileCount += 1;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  } catch (error) {
    console.error("[scanlator-quota] gagal menghitung:", error instanceof Error ? error.message : error);
  }

  return { usedBytes, limitBytes: SCANLATOR_QUOTA_BYTES, fileCount };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
