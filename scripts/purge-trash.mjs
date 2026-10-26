import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import pg from "pg";

/**
 * Hapus permanen semua manga di Trash (deleted_at terisi):
 * file R2 di kedua akun (covers/<slug>/ + chapters/<slug>/) lalu baris DB
 * (project_chapters ikut ter-cascade). Tidak bisa dibatalkan.
 *
 * Default DRY RUN. Tambahkan --execute untuk benar-benar menghapus.
 *   node --env-file=.env.local scripts/purge-trash.mjs [--execute]
 */

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
  return out;
}

const env = {
  ...loadEnv(resolve(projectRoot, "..", "ryukomik-project-db", ".env")),
  ...loadEnv(resolve(projectRoot, ".env.local")),
  ...process.env,
};

const execute = process.argv.includes("--execute");

const targets = [
  {
    id: "akun1",
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    }),
    bucket: env.R2_BUCKET_NAME,
  },
];
if (env.R2_ALT_ACCOUNT_ID && env.R2_ALT_BUCKET_NAME) {
  targets.push({
    id: "akun2",
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ALT_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ALT_ACCESS_KEY_ID, secretAccessKey: env.R2_ALT_SECRET_ACCESS_KEY },
    }),
    bucket: env.R2_ALT_BUCKET_NAME,
  });
}

async function listPrefix(target, prefix) {
  const out = [];
  let token;
  do {
    const res = await target.client.send(
      new ListObjectsV2Command({ Bucket: target.bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }),
    );
    for (const obj of res.Contents || []) out.push({ key: obj.Key, size: Number(obj.Size) || 0 });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

const db = new pg.Client({ connectionString: env.PROJECT_DATABASE_URL });
await db.connect();

const { rows } = await db.query(
  `select slug, title, deleted_at from project_manga where deleted_at is not null order by deleted_at asc`,
);

if (!rows.length) {
  console.log("Trash kosong.");
  await db.end();
  process.exit(0);
}

let totalFiles = 0;
let totalBytes = 0;
const plan = [];

for (const manga of rows) {
  const perTarget = [];
  for (const target of targets) {
    const files = [
      ...(await listPrefix(target, `covers/${manga.slug}/`)),
      ...(await listPrefix(target, `chapters/${manga.slug}/`)),
    ];
    perTarget.push({ target, files });
  }
  const files = perTarget.reduce((sum, item) => sum + item.files.length, 0);
  const bytes = perTarget.reduce((sum, item) => sum + item.files.reduce((s, f) => s + f.size, 0), 0);
  totalFiles += files;
  totalBytes += bytes;
  plan.push({ manga, perTarget, files, bytes });
}

console.log(`Trash: ${rows.length} judul · ${totalFiles} file · ${(totalBytes / 1e9).toFixed(2)} GB\n`);
for (const item of plan) {
  console.log(`- ${item.manga.slug} · ${item.files} file · ${(item.bytes / 1e6).toFixed(1)} MB · masuk trash ${item.manga.deleted_at.toISOString().slice(0, 10)}`);
}

if (!execute) {
  console.log("\nDry run. Tambahkan --execute untuk menghapus permanen.");
  await db.end();
  process.exit(0);
}

for (const item of plan) {
  for (const { target, files } of item.perTarget) {
    for (let i = 0; i < files.length; i += 500) {
      const batch = files.slice(i, i + 500);
      await target.client.send(
        new DeleteObjectsCommand({
          Bucket: target.bucket,
          Delete: { Objects: batch.map((f) => ({ Key: f.key })), Quiet: true },
        }),
      );
    }
  }
  await db.query("delete from project_manga where slug = $1", [item.manga.slug]);
  console.log(`dihapus: ${item.manga.slug} (${item.files} file)`);
}

const left = await db.query("select count(*)::int n from project_manga where deleted_at is not null");
console.log(`\nSelesai. Sisa di trash: ${left.rows[0].n}`);
await db.end();
