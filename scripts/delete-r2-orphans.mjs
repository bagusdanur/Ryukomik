import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * Hapus file orphan R2 berdasarkan laporan audit (scripts/audit-r2-orphans.mjs).
 *
 * Default = DRY RUN (hanya menampilkan rencana). Tambahkan --execute untuk
 * benar-benar menghapus. Hanya key yang tercatat sebagai `orphans` di laporan
 * yang boleh dihapus.
 *
 * Pakai:
 *   node --env-file=.env.local scripts/delete-r2-orphans.mjs [laporan.json] [--execute]
 */

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
  return out;
}

const env = { ...loadEnv(resolve(projectRoot, ".env.local")), ...process.env };
const accountId = env.R2_ACCOUNT_ID;
const accessKeyId = env.R2_ACCESS_KEY_ID;
const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
const bucket = env.R2_BUCKET_NAME;
if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error("Env R2 belum lengkap.");

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const reportArg = args.find((arg) => !arg.startsWith("--"));
const reportPath = reportArg
  ? resolve(projectRoot, reportArg)
  : resolve(projectRoot, "data", "audit-r2-orphans-2026-10-26T17-09-11-392Z.json");
if (!existsSync(reportPath)) throw new Error(`Laporan tidak ditemukan: ${reportPath}`);

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const orphans = Array.isArray(report.orphans) ? report.orphans : [];
const totalBytes = orphans.reduce((sum, obj) => sum + (Number(obj.size) || 0), 0);

console.log(`Laporan : ${reportPath}`);
console.log(`Kandidat: ${orphans.length} file, ${(totalBytes / 1000 ** 2).toFixed(1)} MB`);
console.log(`Mode    : ${execute ? "HAPUS" : "dry-run (tambahkan --execute)"}`);

if (!execute) {
  orphans.slice(0, 10).forEach((obj) => console.log(`  - ${obj.key}`));
  process.exit(0);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

let deleted = 0;
for (let i = 0; i < orphans.length; i += 500) {
  const batch = orphans.slice(i, i + 500);
  const result = await r2.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: batch.map((obj) => ({ Key: obj.key })), Quiet: true },
    }),
  );
  const errors = result.Errors || [];
  deleted += batch.length - errors.length;
  if (errors.length) {
    console.error(`  ${errors.length} gagal di batch ${i / 500 + 1}:`, errors.slice(0, 3));
  }
}

console.log(`Terhapus: ${deleted} file`);

// Verifikasi: hitung ulang isi bucket setelah penghapusan.
let remaining = 0;
let remainingBytes = 0;
let token;
do {
  const list = await r2.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 }));
  for (const obj of list.Contents || []) {
    remaining += 1;
    remainingBytes += Number(obj.Size) || 0;
  }
  token = list.IsTruncated ? list.NextContinuationToken : undefined;
} while (token);

console.log(`Bucket sekarang: ${remaining} file, ${(remainingBytes / 1000 ** 3).toFixed(2)} GB (desimal)`);
