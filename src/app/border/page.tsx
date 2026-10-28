import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import BorderGallery from "@/components/border/BorderGallery";

export const metadata: Metadata = {
  title: "Koleksi Border Avatar - Ryukomik",
  description:
    "Semua border avatar Ryukomik: ring warna, frame klasik, dan frame shop. Pilih dan pakai langsung dari profilmu.",
  alternates: { canonical: "https://ryukomik.my.id/border" },
  openGraph: {
    title: "Koleksi Border Avatar - Ryukomik",
    description: "Pilih border avatar yang tampil di komentar, leaderboard, dan profil publik.",
    type: "website",
  },
};

export default function BorderGalleryPage() {
  return (
    <main className="rk-page min-h-dvh pb-24 text-white">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/social-settings"
            aria-label="Kembali ke pengaturan profil"
            className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/[0.07] hover:text-white"
          >
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="text-lg font-black tracking-tight">Koleksi Border</h1>
            <p className="text-[11px] text-white/40">Pilih border, langsung tersimpan di profilmu.</p>
          </div>
        </div>

        <BorderGallery />
      </div>
    </main>
  );
}
