import Link from "next/link";
import { FiCompass, FiHome, FiSearch } from "react-icons/fi";
import MarqueeCoverGrid from "@/components/MarqueeCoverGrid";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-6 text-center text-white">
      {/* Infinite Multi-Column Marquee Grid Background */}
      <MarqueeCoverGrid
        opacity={0.22}
        tiltAngle={-10}
        scale={1.15}
        overlayGradient="radial-gradient(circle at center, rgba(10, 11, 18, 0.72) 15%, rgba(10, 11, 18, 0.95) 85%), linear-gradient(to bottom, rgba(10, 11, 18, 0.85) 0%, transparent 35%, transparent 65%, rgba(10, 11, 18, 0.98) 100%)"
      />

      <div className="relative z-10 flex flex-col items-center">
        <p className="text-7xl font-black text-[var(--accent-2)]/90 drop-shadow-[0_4px_24px_rgba(34,211,238,0.25)] sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-xl font-black sm:text-2xl">Halaman tidak ditemukan</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">
          Halaman yang kamu cari sudah dipindahkan, dihapus, atau memang tidak pernah ada. Coba cari komiknya langsung atau kembali ke beranda.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="flex items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 py-2.5 text-sm font-black text-black transition hover:brightness-110 shadow-lg shadow-[var(--accent-2)]/20">
            <FiHome /> Beranda
          </Link>
          <Link href="/search" className="flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] backdrop-blur-sm px-5 py-2.5 text-sm font-black text-white/80 transition hover:bg-white/10">
            <FiSearch /> Cari komik
          </Link>
          <Link href="/pustaka" className="flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] backdrop-blur-sm px-5 py-2.5 text-sm font-black text-white/80 transition hover:bg-white/10">
            <FiCompass /> Jelajahi
          </Link>
        </div>
      </div>
    </main>
  );
}
