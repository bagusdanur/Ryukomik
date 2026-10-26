import { NextResponse } from "next/server";
import { paymentsEnabled, PAYMENTS_DISABLED_MESSAGE } from "@/lib/payments";

/**
 * Webhook pembayaran — DINONAKTIFKAN.
 *
 * Provider lama (Pakasir) sudah ditutup dan sedang diganti. Seluruh logika lama
 * sudah dihapus (termasuk pembacaan tabel profiles Supabase) supaya tidak ada
 * jalur mati yang masih menyentuh data profil. Saat provider baru dipasang:
 *   1. implementasi verifikasi tanda tangan provider di sini,
 *   2. tulis transaksi ke payment_transactions,
 *   3. aktifkan premium lewat updateLocalProfile() + bumpProfileSignal(),
 *   4. set PAYMENTS_ENABLED=1.
 */
export async function POST() {
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: PAYMENTS_DISABLED_MESSAGE }, { status: 503 });
  }

  // Belum ada provider aktif: jangan pernah menganggap webhook valid.
  return NextResponse.json({ error: "Provider pembayaran belum dikonfigurasi." }, { status: 503 });
}
