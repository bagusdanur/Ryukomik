import { NextResponse } from "next/server";
import { paymentsEnabled, PAYMENTS_DISABLED_MESSAGE } from "@/lib/payments";

/**
 * Pembuatan transaksi — DINONAKTIFKAN (Pakasir ditutup, provider baru belum ada).
 * Logika lama dihapus supaya tidak ada jalur yang masih memanggil API Pakasir.
 */
export async function POST() {
  return NextResponse.json(
    { error: paymentsEnabled() ? "Provider pembayaran belum dikonfigurasi." : PAYMENTS_DISABLED_MESSAGE },
    { status: 503 },
  );
}
