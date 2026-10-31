import type { Metadata } from "next";
import RiwayatTontonClient from "./RiwayatTontonClient";

export const metadata: Metadata = {
  title: "Riwayat Tonton - Ryukomik",
  description: "Lanjutkan menonton anime dan donghua dari episode terakhir di perangkat ini.",
  robots: { index: false, follow: true },
};

export default function RiwayatTontonPage() {
  return <RiwayatTontonClient />;
}
