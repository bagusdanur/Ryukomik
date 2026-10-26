import PremiumPayClient from "./PremiumPayClient";
import { paymentsEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PremiumPayPage() {
  // Hanya pembayaran OTOMATIS (gateway lama/Pakasir) yang dimatikan.
  // Konfirmasi manual oleh admin tetap berjalan; kode premium juga tetap bisa
  // ditukar lewat PremiumModal.
  return <PremiumPayClient autoEnabled={paymentsEnabled()} />;
}
