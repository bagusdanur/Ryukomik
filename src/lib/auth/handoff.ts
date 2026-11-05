import "server-only";

import { randomInt } from "node:crypto";

import { socialQuery } from "@/lib/social/db";

/**
 * Kode serah-terima login untuk PWA.
 *
 * Kenapa perlu: di Android, login Google pada PWA selesai di browser/Custom Tab,
 * jadi cookie sesi masuk ke jar browser — bukan ke jar aplikasi. Aplikasi lalu
 * tetap terlihat "belum login". Solusinya: setelah OAuth, terbitkan kode 6 digit
 * sekali pakai; pengguna menempelkannya di aplikasi, dan aplikasi membuat
 * sesinya sendiri (cookie diset di konteks aplikasi).
 */

const TTL_MINUTES = 10;

export async function createHandoffCode(userId: string): Promise<string> {
  // Bersihkan kode kedaluwarsa sesekali.
  await socialQuery("delete from auth_handoff_codes where expires_at < now() - interval '1 day'").catch(() => undefined);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = String(randomInt(100000, 1000000));
    try {
      await socialQuery(
        "insert into auth_handoff_codes (code, user_id, expires_at) values ($1, $2, now() + ($3 || ' minutes')::interval)",
        [code, userId, String(TTL_MINUTES)],
      );
      return code;
    } catch {
      // tabrakan kode (sangat jarang) — coba lagi
    }
  }
  throw new Error("Gagal membuat kode login.");
}

export async function consumeHandoffCode(code: string): Promise<string | null> {
  const normalized = code.replace(/[^\d]/g, "").slice(0, 6);
  if (normalized.length !== 6) return null;

  const { rows } = await socialQuery<{ user_id: string }>(
    `update auth_handoff_codes
        set used_at = now()
      where code = $1 and used_at is null and expires_at > now()
      returning user_id::text as user_id`,
    [normalized],
  );
  return rows[0]?.user_id || null;
}
