import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import pg from "pg";

/**
 * Pindahkan series (cover + semua chapter) dari akun R2 pertama ke bucket
 * akun kedua, lalu update URL di project DB.
 *
 * Urutan per series: copy objek -> verifikasi ukuran -> update DB (transaksi)
 * -> baru hapus file lama. Kalau salah satu langkah gagal, file lama tetap ada.
 *
 * Pakai:
 *   node --env-file=.env.local scripts/migrate-r2-series.mjs --target-bytes=1700000000
 *   node --env-file=.env.local scripts/migrate-r2-series.mjs --target-bytes=1700000000 --execute
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

const env = { ...loadEnv(resolve(projectRoot, "..", "ryukomik-project-db", ".env")), ...loadEnv(resolve(projectRoot, ".env.local")), ...process.env };
const dbUrl = env.PROJECT_DATABASE_URL;
if (!dbUrl) throw new Error("PROJECT_DATABASE_URL tidak ditemukan.");

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const targetBytes = Number((args.find((a) => a.startsWith("--target-bytes=")) || "").split("=")[1] || 1_700_000_000);
const onlySlug = (args.find((a) => a.startsWith("--slug=")) || "").split("=")[1];

const PRIMARY_BASE = (env.NEXT_PUBLIC_TRANSLATE_CDN || "https://storage.ryukomik.my.id").replace(/\/+$/, "");
const ALT_BASE = (env.R2_ALT_PUBLIC_BASE || "https://storage.komano.my.id").replace(/\/+$/, "");

const primary = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const alt = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ALT_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ALT_ACCESS_KEY_ID, secretAccessKey: env.R2_ALT_SECRET_ACCESS_KEY },
});

const P_BUCKET = env.R2_BUCKET_NAME;
const A_BUCKET = env.R2_ALT_BUCKET_NAME;

async function listAll(client, bucket) {
  const out = [];
  let token;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 }));
    for (const obj of res.Contents || []) out.push({ key: obj.Key, size: Number(obj.Size) || 0 });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

const objects = await listAll(primary, P_BUCKET);
const bySlug = new Map();
const addTo = (slug, span) => {
  const item = bySlug.get(slug) || { slug, files: [], bytes: 0 };
  item.files.push(span);
  item.bytes += span.size;
  bySlug.set(slug, item);
};
for (const obj of objects) {
  const m = obj.key.match(/^(?:chapters|covers)\/([a-z0-9][a-z0-9-]*)\//i);
  if (m) addTo(m[1], obj);
}

const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
const { rows: mangas } = await db.query(
  `select slug, title, created_at from project_manga where deleted_at is null order by created_at desc nulls last`,
);

const picked = [];
let pickedBytes = 0;
for (const manga of mangas) {
  if (onlySlug && manga.slug !== onlySlug) continue;
  const item = bySlug.get(manga.slug);
  if (!item || item.bytes === 0) continue;
  picked.push({ ...manga, ...item });
  pickedBytes += item.bytes;
  if (!onlySlug && pickedBytes >= targetBytes) break;
}

const totalPrimary = objects.reduce((s, o) => s + o.size, 0);
console.log(`Akun 1 sekarang : ${(totalPrimary / 1e9).toFixed(2)} GB / ${objects.length} file`);
console.log(`Target pindah   : ${(targetBytes / 1e9).toFixed(2)} GB`);
console.log(`Terpilih        : ${picked.length} series, ${(pickedBytes / 1e9).toFixed(2)} GB, ${picked.reduce((s, p) => s + p.files.length, 0)} file`);
for (const p of picked) {
  console.log(`  - ${p.slug} · ${(p.bytes / 1e6).toFixed(1)} MB · ${p.files.length} file · dibuat ${p.created_at?.toISOString().slice(0, 10)}`);
}
console.log(`Perkiraan akun 1 setelah pindah: ${((totalPrimary - pickedBytes) / 1e9).toFixed(2)} GB`);

if (!execute) {
  console.log("\nDry run. Tambahkan --execute untuk menjalankan.");
  await db.end();
  process.exit(0);
}

let movedBytes = 0;
let movedFiles = 0;

for (const series of picked) {
  console.log(`\n→ ${series.slug} (${(series.bytes / 1e6).toFixed(1)} MB)`);

  // 1. Copy + verifikasi.
  const copied = [];
  const queue = [...series.files];
  const worker = async () => {
    for (;;) {
      const obj = queue.shift();
      if (!obj) return;
      const src = await primary.send(new GetObjectCommand({ Bucket: P_BUCKET, Key: obj.key }));
      const body = await src.Body.transformToByteArray();
      await alt.send(
        new PutObjectCommand({
          Bucket: A_BUCKET,
          Key: obj.key,
          Body: body,
          ContentType: src.ContentType || "application/octet-stream",
          CacheControl: src.CacheControl,
        }),
      );
      const head = await alt.send(new HeadObjectCommand({ Bucket: A_BUCKET, Key: obj.key }));
      if (Number(head.ContentLength) !== body.byteLength) {
        throw new Error(`Ukuran tidak cocok untuk ${obj.key}: ${head.ContentLength} != ${body.byteLength}`);
      }
      copied.push(obj);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`   copy+verifikasi: ${copied.length} file`);

  // 2. Update URL di DB (transaksi).
  await db.query("begin");
  try {
    await db.query(
      `update project_manga
          set cover_url = replace(cover_url, $1, $2), updated_at = now()
        where slug = $3 and cover_url like $1 || '%'`,
      [PRIMARY_BASE, ALT_BASE, series.slug],
    );
    const ch = await db.query(
      `update project_chapters
          set image_urls = (
            select coalesce(jsonb_agg(to_jsonb(replace(value, $1, $2))), '[]'::jsonb)
              from jsonb_array_elements_text(image_urls) as value
          )
        where manga_slug = $3
          and image_urls::text like '%' || $1 || '%'`,
      [PRIMARY_BASE, ALT_BASE, series.slug],
    );
    await db.query("commit");
    console.log(`   DB: cover diupdate, ${ch.rowCount} chapter diupdate`);
  } catch (error) {
    await db.query("rollback");
    throw error;
  }

  // 3. Hapus file lama setelah DB aman.
  for (let i = 0; i < copied.length; i += 500) {
    const batch = copied.slice(i, i + 500);
    await primary.send(
      new DeleteObjectsCommand({
        Bucket: P_BUCKET,
        Delete: { Objects: batch.map((o) => ({ Key: o.key })), Quiet: true },
      }),
    );
  }
  movedBytes += series.bytes;
  movedFiles += copied.length;
  console.log(`   hapus lama: ${copied.length} file`);
}

console.log(`\nSelesai: ${movedFiles} file / ${(movedBytes / 1e9).toFixed(2)} GB dipindah.`);

const [pLeft, aLeft] = await Promise.all([listAll(primary, P_BUCKET), listAll(alt, A_BUCKET)]);
console.log(`Akun 1: ${(pLeft.reduce((s, o) => s + o.size, 0) / 1e9).toFixed(2)} GB / ${pLeft.length} file`);
console.log(`Akun 2: ${(aLeft.reduce((s, o) => s + o.size, 0) / 1e9).toFixed(2)} GB / ${aLeft.length} file`);
await db.end();
