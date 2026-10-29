#!/usr/bin/env node
/** Pindahkan premium_codes, premium_requests, payment_transactions ke lokal. */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);
const dryRun = process.argv.includes("--dry-run");
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE = 500;

async function page(table, select, offset) {
  const res = await fetch(`${SB}/rest/v1/${table}?select=${select}&order=id.asc&limit=${PAGE}&offset=${offset}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

let codes = 0;
for (let offset = 0; ; offset += PAGE) {
  const rows = await page("premium_codes", "id,code,duration_days,used,used_by,used_at,created_at", offset);
  if (!rows.length) break;
  if (!dryRun) {
    await db.query(
      `insert into premium_codes (id, code, duration_days, used, used_by, used_at, created_at)
       select * from unnest($1::uuid[], $2::text[], $3::int[], $4::boolean[], $5::uuid[], $6::timestamptz[], $7::timestamptz[])
       on conflict (id) do nothing`,
      [
        rows.map((r) => r.id), rows.map((r) => r.code), rows.map((r) => Number(r.duration_days) || 0),
        rows.map((r) => Boolean(r.used)), rows.map((r) => r.used_by ?? null),
        rows.map((r) => r.used_at ?? null), rows.map((r) => r.created_at),
      ],
    );
  }
  codes += rows.length;
  if (rows.length < PAGE) break;
}

let requests = 0;
for (let offset = 0; ; offset += PAGE) {
  const rows = await page("premium_requests", "id,user_id,name,proof_url,status,package_name,duration_days,amount,sk_agreed,sk_agreed_at,created_at,updated_at", offset);
  if (!rows.length) break;
  if (!dryRun) {
    await db.query(
      `insert into premium_requests (id, user_id, name, proof_url, status, package_name, duration_days, amount, sk_agreed, sk_agreed_at, created_at, updated_at)
       select * from unnest($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[], $7::int[], $8::int[], $9::boolean[], $10::timestamptz[], $11::timestamptz[], $12::timestamptz[])
       on conflict (id) do nothing`,
      [
        rows.map((r) => r.id), rows.map((r) => r.user_id), rows.map((r) => r.name ?? null),
        rows.map((r) => r.proof_url ?? null), rows.map((r) => r.status || "pending"),
        rows.map((r) => r.package_name ?? null), rows.map((r) => r.duration_days ?? null),
        rows.map((r) => r.amount ?? null), rows.map((r) => Boolean(r.sk_agreed)),
        rows.map((r) => r.sk_agreed_at ?? null), rows.map((r) => r.created_at),
        rows.map((r) => r.updated_at ?? r.created_at),
      ],
    );
  }
  requests += rows.length;
  if (rows.length < PAGE) break;
}

let tx = 0;
for (let offset = 0; ; offset += PAGE) {
  const rows = await page("payment_transactions", "id,user_id,order_id,package_name,duration_days,amount,fee,total_payment,payment_method,payment_number,status,expired_at,completed_at,created_at", offset);
  if (!rows.length) break;
  if (!dryRun) {
    await db.query(
      `insert into payment_transactions (id, user_id, order_id, package_name, duration_days, amount, fee, total_payment, payment_method, payment_number, status, expired_at, completed_at, created_at)
       select * from unnest($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::int[], $6::int[], $7::int[], $8::int[], $9::text[], $10::text[], $11::text[], $12::timestamptz[], $13::timestamptz[], $14::timestamptz[])
       on conflict (id) do nothing`,
      [
        rows.map((r) => r.id), rows.map((r) => r.user_id ?? null), rows.map((r) => r.order_id ?? null),
        rows.map((r) => r.package_name ?? null), rows.map((r) => r.duration_days ?? null),
        rows.map((r) => r.amount ?? null), rows.map((r) => r.fee ?? null),
        rows.map((r) => r.total_payment ?? null), rows.map((r) => r.payment_method ?? null),
        rows.map((r) => r.payment_number ?? null), rows.map((r) => r.status ?? null),
        rows.map((r) => r.expired_at ?? null), rows.map((r) => r.completed_at ?? null),
        rows.map((r) => r.created_at),
      ],
    );
  }
  tx += rows.length;
  if (rows.length < PAGE) break;
}

const { rows: counts } = await db.query(
  "select (select count(*) from premium_codes)::int c, (select count(*) from premium_requests)::int r, (select count(*) from payment_transactions)::int t",
);
await db.end();
console.log(`${dryRun ? "[dry-run] " : ""}dibaca ${codes}/${requests}/${tx} | lokal: ${counts[0].c}/${counts[0].r}/${counts[0].t}`);
