/**
 * Kirim pengumuman pindah domain ke SEMUA langganan push lama.
 * Endpoint yang sudah mati (404/410) dihapus dari DB supaya bersih.
 *
 * Pakai: node scripts/push-broadcast-domain.mjs [--limit N] [--dry]
 */
import dotenv from "dotenv";
import pg from "pg";
import webPush from "web-push";

dotenv.config({ path: ".env.local", quiet: true });

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@ryukomik.com";
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("VAPID tidak lengkap");
  process.exit(1);
}
webPush.setVapidDetails(SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const DRY = process.argv.includes("--dry");
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0;
const CONCURRENCY = 12;

const argVal = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const payload = JSON.stringify({
  title: argVal("--title", "Ryukomik pindah domain"),
  body: argVal(
    "--body",
    "Sekarang di ryukomik.com. Domain lama sudah tidak bisa dibuka — ketuk untuk lanjut baca.",
  ),
  url: "https://ryukomik.com/",
  tag: "domain-move",
});

const db = new pg.Client({ connectionString: process.env.SOCIAL_DATABASE_URL });
await db.connect();

const sql = `select id, endpoint, p256dh, auth from push_subscriptions order by id${LIMIT > 0 ? ` limit ${LIMIT}` : ""}`;
const { rows } = await db.query(sql);
console.log(`target: ${rows.length} langganan${DRY ? " (DRY RUN)" : ""}`);
if (!rows.length || DRY) {
  await db.end();
  process.exit(0);
}

let ok = 0;
let gone = 0;
let otherFail = 0;
let cursor = 0;

async function worker() {
  while (cursor < rows.length) {
    const sub = rows[cursor++];
    try {
      const res = await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 86400, urgency: "high" },
      );
      if (res.statusCode >= 200 && res.statusCode < 300) ok += 1;
      else otherFail += 1;
    } catch (error) {
      const code = error.statusCode;
      if (code === 404 || code === 410) {
        gone += 1;
        await db.query("delete from push_subscriptions where id = $1", [sub.id]).catch(() => {});
      } else {
        otherFail += 1;
        if (otherFail <= 5) console.error("gagal:", code || "?", String(error.body || error.message).slice(0, 120));
      }
    }
    const done = ok + gone + otherFail;
    if (done % 100 === 0) console.log(`  progres ${done}/${rows.length}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`selesai: terkirim=${ok} mati=${gone} gagal_lain=${otherFail}`);
await db.end();
