import dotenv from "dotenv";
import pg from "pg";
import webPush from "web-push";

dotenv.config({ path: ".env.local", quiet: true });

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@ryukomik.web.id";

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("VAPID tidak lengkap");
  process.exit(1);
}
webPush.setVapidDetails(SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const limit = Number(process.argv[2] || 3);
const dryRun = process.argv.includes("--dry");

const db = new pg.Client({ connectionString: process.env.SOCIAL_DATABASE_URL });
await db.connect();

const { rows } = dryRun
  ? await db.query("select id, endpoint, p256dh, auth from push_subscriptions order by random() limit $1", [limit])
  : await db.query("select id, endpoint, p256dh, auth from push_subscriptions order by random() limit $1", [limit]);

const payload = JSON.stringify({
  title: "Ryukomik pindah domain",
  body: "Domain baru: ryukomik.web.id — klik untuk lanjut baca. Bookmark lama sudah tidak berlaku.",
  url: "https://ryukomik.web.id/",
  tag: "domain-move",
});

const tally = {};
for (const sub of rows) {
  const host = new URL(sub.endpoint).host;
  if (dryRun) {
    console.log(`DRY ${host}`);
    continue;
  }
  try {
    const res = await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 86400, urgency: "high" },
    );
    console.log(`OK   ${host} → HTTP ${res.statusCode}`);
    tally.ok = (tally.ok || 0) + 1;
  } catch (error) {
    console.log(`GAGAL ${host} → HTTP ${error.statusCode || "?"} ${String(error.body || error.message).slice(0, 160)}`);
    tally[error.statusCode || "err"] = (tally[error.statusCode || "err"] || 0) + 1;
  }
}
console.log("ringkas:", JSON.stringify(tally));
await db.end();
