import "server-only";

import { socialQuery, socialTransaction } from "@/lib/social/db";
import { computePremiumUntil } from "@/lib/requestAuthPolicy";

/* ---------------- Kode premium ---------------- */

export async function listPremiumCodes(limit = 100) {
  const { rows } = await socialQuery(
    `select id::text as id, code, used, duration_days, created_at, used_at, used_by
       from premium_codes order by created_at desc limit $1`,
    [limit],
  );
  return rows;
}

/** Klaim kode secara atomik (hanya berhasil sekali). */
export async function claimPremiumCode(code: string, userId: string) {
  const { rows } = await socialQuery<{ id: string; duration_days: number }>(
    `update premium_codes
        set used = true, used_by = $2, used_at = now()
      where code = $1 and used = false
      returning id::text as id, duration_days`,
    [code, userId],
  );
  return rows[0] ?? null;
}

/** Lepas klaim kalau grant premium gagal (kode tidak boleh terbakar). */
export async function releasePremiumCode(id: string) {
  await socialQuery(
    "update premium_codes set used = false, used_by = null, used_at = null where id = $1",
    [id],
  );
}

export async function deletePremiumCode(id: string) {
  await socialQuery("delete from premium_codes where id = $1", [id]);
}

/**
 * Buat kode premium baru (pengganti RPC generate_premium_code).
 * Format: <PREFIX>-XXXX-XXXX, karakter aman dibaca (tanpa 0/O/1/I).
 */
export async function generatePremiumCode(durationDays: number, prefix = "RYU") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  const cleanPrefix = (prefix || "RYU").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "RYU";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${cleanPrefix}-${block()}-${block()}`;
    try {
      const { rows } = await socialQuery<{ code: string; duration_days: number }>(
        `insert into premium_codes (code, duration_days) values ($1, $2)
         on conflict (code) do nothing
         returning code, duration_days`,
        [code, durationDays],
      );
      if (rows[0]) return rows[0];
    } catch {
      /* coba kode lain */
    }
  }
  throw new Error("Gagal membuat kode unik.");
}

/* ---------------- Request premium manual ---------------- */

const PROFILE_JSON = `json_build_object('username', p.username, 'avatar_url', p.avatar_url) as profiles`;

export async function listPremiumRequests(filter = "all", limit = 50) {
  const params: unknown[] = [];
  let where = "";
  if (filter !== "all") {
    params.push(filter);
    where = ` where r.status = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await socialQuery(
    `select r.id::text as id, r.user_id, r.status, r.name, r.proof_url, r.package_name,
            r.duration_days, r.amount, r.sk_agreed, r.sk_agreed_at, r.created_at, ${PROFILE_JSON}
       from premium_requests r
       left join social_profiles p on p.user_id = r.user_id${where}
      order by r.created_at desc
      limit $${params.length}`,
    params,
  );
  return rows;
}

/** Tolak request yang masih pending (idempoten). */
export async function rejectPremiumRequest(id: string) {
  const { rowCount } = await socialQuery(
    "update premium_requests set status = 'rejected', updated_at = now() where id = $1 and status = 'pending'",
    [id],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Setujui request manual: status → approved + premium_until dihitung dari
 * entitlement lokal user (pengganti RPC approve_manual_premium_request).
 *
 * Dijalankan dalam satu transaksi dengan conditional UPDATE, jadi dua admin
 * yang menekan setuju bersamaan tidak bisa memberi premium dua kali.
 */
export async function approvePremiumRequest(id: string) {
  return socialTransaction(async (client) => {
    const { rows } = await client.query<{ user_id: string; duration_days: number | null }>(
      `update premium_requests set status = 'approved', updated_at = now()
        where id = $1 and status = 'pending'
        returning user_id, duration_days`,
      [id],
    );
    const request = rows[0];
    if (!request) throw new Error("Permintaan sudah diproses.");

    const profile = await client.query<{ premium_until: string | null }>(
      "select premium_until from social_profiles where user_id = $1",
      [request.user_id],
    );
    const days = Number(request.duration_days) > 0 ? Number(request.duration_days) : 30;
    const premiumUntil = computePremiumUntil(profile.rows[0]?.premium_until ?? null, days);

    return { user_id: request.user_id, premium_until: premiumUntil };
  });
}

/* ---------------- Transaksi pembayaran (dorman) ---------------- */

export async function listPaymentTransactions(limit = 100) {
  const { rows } = await socialQuery(
    `select id::text as id, user_id, order_id, package_name, duration_days, amount, fee,
            total_payment, payment_method, payment_number, status, expired_at, completed_at, created_at
       from payment_transactions order by created_at desc limit $1`,
    [limit],
  );
  return rows;
}

export async function countPendingPremiumRequests() {
  const { rows } = await socialQuery<{ c: number }>(
    "select count(*)::int as c from premium_requests where status = 'pending'",
  );
  return rows[0]?.c ?? 0;
}
