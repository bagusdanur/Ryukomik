import { Metadata } from "next";
import AdsClient from "./AdsClient";

export const metadata: Metadata = {
  title: "Pasang Iklan - Ryukomik",
  description: "Pasang banner iklan di Ryukomik untuk menjangkau pembaca manga, manhwa, dan manhua Indonesia. Hubungi ads@ryukomik.id untuk harga dan ketersediaan slot.",
  alternates: {
    canonical: "https://ryukomik.my.id/ads",
  },
};

export default function AdsPage() {
  return <AdsClient />;
}
