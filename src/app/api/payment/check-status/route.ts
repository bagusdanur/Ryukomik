import { NextResponse } from "next/server";
import { paymentsEnabled, PAYMENTS_DISABLED_MESSAGE } from "@/lib/payments";

/**
 * Cek status transaksi — DINONAKTIFKAN bersama provider lamanya.
 * Saat provider baru dipasang, endpoint ini kembali membaca payment_transactions
 * dengan filter user yang login.
 */
export async function GET() {
  return NextResponse.json(
    { error: paymentsEnabled() ? "Provider pembayaran belum dikonfigurasi." : PAYMENTS_DISABLED_MESSAGE },
    { status: 503 },
  );
}
