import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * AUDIT (read-only): file di R2 yang tidak direferensikan database project.
 *
 * Membandingkan listing bucket dengan:
 *   - project_manga.cover_url
 *   - project_chapters.image_urls
 *
 * Tidak menghapus apa pun. Hasil: ringkasan + JSON berisi daftar kandidat.
 */

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return out;
}

const localEnv = loadEnv(resolve("ryukomik/.env.local"));
const projectEnv = loadEnv(resolve("ryukomik-project-db/.env"));
const pick = (key, ...sources) => process.env[key] || sources.map((s) => s[key]).find(Boolean) || "";

const databaseUrl = pick("PROJECT_DATABASE_URL", projectEnv);
const accountId = pick("R2_ACCOUNT_ID", localEnv);
const accessKeyId = pick("R2_ACCESS_KEY_ID", localEnv);
const secretAccessKey = pick("R2_SECRET_ACCESS_KEY", localEnv);
const bucket = pick("R2_BUCKET_NAME", localEnv);

if (!databaseUrl || !accountId || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error("Env belum lengkap (PROJECT_DATABASE_URL / R2_*).");
}

/** URL -> key R2 (path tanpa leading slash, tanpa query). */
function keyFromUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const path = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (!path) return null;
    // Buang prefix bucket bila URL memakai gaya /<bucket>/<key>
    return path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
  } catch {
    return null;
  }
}

const db = new pg.Client({ connectionString: databaseUrl });
await db.connect();

const { rows: mangas } = await db.query("select slug, cover_url, deleted_at from project_manga");
const { rows: chapters } = await db.query("select manga_slug, chapter_number, image_urls from project_chapters");

const referenced = new Map(); // key -> sumber
for (const manga of mangas) {
  const key = keyFromUrl(manga.cover_url);
  if (key) referenced.set(key, `cover:${manga.slug}${manga.deleted_at ? " (trash)" : ""}`);
}
for (const chapter of chapters) {
  const urls = Array.isArray(chapter.image_urls) ? chapter.image_urls : [];
  for (const url of urls) {
    const key = keyFromUrl(url);
    if (key) referenced.set(key, `chapter:${chapter.manga_slug}/${chapter.chapter_number}`);
  }
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const objects = [];
let token;
do {
  const list = await r2.send(
    new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 }),
  );
  for (const obj of list.Contents || []) {
    if (obj.Key) objects.push({ key: obj.Key, size: Number(obj.Size) || 0, lastModified: obj.LastModified });
  }
  token = list.IsTruncated ? list.NextContinuationToken : undefined;
} while (token);

const orphans = objects.filter((obj) => !referenced.has(obj.key));
const missing = [...referenced.keys()].filter((key) => !objects.some((obj) => obj.key === key));

const sum = (rows) => rows.reduce((total, row) => total + row.size, 0);
const bytes = (n) => `${(n / 1000 ** 2).toFixed(1)} MB`;
const orphansByFolder = new Map();
for (const orphan of orphans) {
  const folder = orphan.key.split("/").slice(0, 2).join("/") || "(root)";
  const entry = orphansByFolder.get(folder) || { files: 0, size: 0 };
  entry.files += 1;
  entry.size += orphan.size;
  orphansByFolder.set(folder, entry);
}

console.log("== Ringkasan R2 vs database project");
console.log(`bucket            : ${bucket}`);
console.log(`objek di R2       : ${objects.length} file, ${bytes(sum(objects))}`);
console.log(`direferensikan DB : ${referenced.size} key (${missing.length} key tidak ada file-nya)`);
console.log(`orphan (kandidat) : ${orphans.length} file, ${bytes(sum(orphans))}`);
console.log("\n== Orphan per folder (top 10)");
[...orphansByFolder.entries()]
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 10)
  .forEach(([folder, info]) => console.log(`  ${folder.padEnd(38)} ${String(info.files).padStart(5)} file  ${bytes(info.size)}`));

console.log("\n== 15 orphan terbesar");
[...orphans]
  .sort((a, b) => b.size - a.size)
  .slice(0, 15)
  .forEach((obj) => console.log(`  ${bytes(obj.size).padStart(10)}  ${obj.key}`));

mkdirSync("data", { recursive: true });
const reportPath = `data/audit-r2-orphans-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      bucket,
      scannedAt: new Date().toISOString(),
      totals: {
        objects: objects.length,
        objectBytes: sum(objects),
        referencedKeys: referenced.size,
        orphanFiles: orphans.length,
        orphanBytes: sum(orphans),
        missingFiles: missing.length,
      },
      orphans: orphans.sort((a, b) => b.size - a.size).map((obj) => ({ ...obj, lastModified: obj.lastModified?.toISOString?.() || null })),
      missing: missing.slice(0, 500),
    },
    null,
    1,
  ),
);
console.log(`\nLaporan: ${reportPath}`);
console.log("Tidak ada file yang dihapus (audit read-only).");

await db.end();
