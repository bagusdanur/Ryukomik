/**
 * Saklar pembayaran otomatis (Pakasir).
 *
 * Provider lama sudah ditutup dan sedang diganti, jadi jalur pembayaran
 * dimatikan lebih dulu. Nyalakan lagi dengan PAYMENTS_ENABLED=1 setelah
 * provider baru terpasang — route, webhook, dan UI membaca saklar ini.
 */
export function paymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "1";
}

export const PAYMENTS_DISABLED_MESSAGE =
  "Pembayaran sedang dinonaktifkan sementara. Metode lama sudah ditutup dan sedang diganti.";
