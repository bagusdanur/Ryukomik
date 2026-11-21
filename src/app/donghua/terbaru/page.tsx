import type { Metadata } from "next";
import TerbaruClient from "./TerbaruClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Donghua Terbaru Sub Indo",
  description:
    "Daftar donghua terbaru sub indo, update episode setiap hari. Nonton donghua Cina sub indo kualitas HD di Ryukomik.",
  alternates: { canonical: "/donghua/terbaru" },
  openGraph: {
    title: "Donghua Terbaru Sub Indo",
    description: "Episode donghua terbaru, update tiap hari.",
    type: "website",
  },
};

export default function Page() {
  return <TerbaruClient />;
}
