/**
 * Aturan periode event Marathon Baca.
 *
 * Semua batas dihitung di zona waktu WIB (Asia/Jakarta) — bukan UTC — supaya
 * pergantian minggu/bulan terjadi tengah malam WIB, bukan 07:00 pagi.
 * Modul ini murni (tanpa DB) agar bisa dites langsung.
 */

const TZ = "Asia/Jakarta";

function jakartaParts(date: Date): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const p = Object.fromEntries(
    fmt.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

/** ISO-8601 week key menurut kalender WIB, contoh: `2026-W44`. */
export function weekKey(date: Date = new Date()): string {
  const { y, m, d } = jakartaParts(date);
  // Tanggal WIB dijadikan "UTC midnight" agar aritmetika minggu tidak bergeser dua kali.
  const t = new Date(Date.UTC(y, m - 1, d));
  const dayNum = t.getUTCDay() || 7; // Senin = 1 .. Minggu = 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum); // pindah ke Kamis di minggu yang sama
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Bulan kalender WIB, contoh: `2026-10`. */
export function monthKey(date: Date = new Date()): string {
  const { y, m } = jakartaParts(date);
  return `${y}-${String(m).padStart(2, "0")}`;
}

export type MarathonEventWindow = {
  starts_at: string;
  ends_at?: string | null;
  is_active: boolean;
};

/** Event dianggap aktif hanya jika flag aktif, sudah mulai, dan belum berakhir. */
export function isEventActive(ev: MarathonEventWindow, now: Date = new Date()): boolean {
  if (!ev?.is_active) return false;
  const start = Date.parse(ev.starts_at);
  if (!Number.isFinite(start)) return false; // data rusak = jangan hitung
  const t = now.getTime();
  if (t < start) return false;
  if (ev.ends_at) {
    const end = Date.parse(ev.ends_at);
    if (!Number.isFinite(end) || t > end) return false;
  }
  return true;
}

/** Sisa kuota chapter hari ini (tidak pernah negatif, tidak melebihi cap). */
export function capRemaining(todayCount: number, cap: number): number {
  const used = Number.isFinite(todayCount) ? Math.max(0, todayCount) : 0;
  const limit = Number.isFinite(cap) ? Math.max(0, cap) : 0;
  return Math.max(0, limit - used);
}

/** Kunci minggu yang baru saja selesai (untuk finalisasi hadiah). */
export function previousWeekKey(date: Date = new Date()): string {
  return weekKey(new Date(date.getTime() - 7 * 86_400_000));
}

/** Kunci bulan yang baru saja selesai (untuk finalisasi hadiah). */
export function previousMonthKey(date: Date = new Date()): string {
  const { y, m } = jakartaParts(date);
  // Hari terakhir bulan sebelumnya, dihitung dari tanggal 1 bulan ini (UTC murni).
  const lastMonthDay = new Date(Date.UTC(y, m - 1, 1) - 86_400_000);
  return `${lastMonthDay.getUTCFullYear()}-${String(lastMonthDay.getUTCMonth() + 1).padStart(2, "0")}`;
}
