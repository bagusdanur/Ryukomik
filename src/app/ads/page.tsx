import { Metadata } from "next";
import AdsClient from "./AdsClient";

export const metadata: Metadata = {
  title: "Pasang Iklan - Ryukomik",
  description: "Media Kit Ryukomik. Jangkau ratusan ribu pembaca komik aktif setiap bulan dengan memasang banner iklan di spot-spot strategis Ryukomik.",
  alternates: {
    canonical: "https://ryukomik.my.id/ads",
  },
};

export default function AdsPage() {
  return <AdsClient />;
}
