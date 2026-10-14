import Link from "next/link";
import { FiCompass, FiHome, FiSearch } from "react-icons/fi";

export default function NotFound() {
  return (
    <main className="rk-page flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white">
      <p className="text-7xl font-black text-[var(--accent-2)]/80 sm:text-8xl">404</p>
      <h1 className="mt-4 text-xl font-black sm:text-2xl">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">
        Halaman yang kamu cari sudah dipindahkan, dihapus, atau memang tidak pernah ada. Coba cari komiknya langsung atau kembali ke beranda.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="flex items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 py-2.5 text-sm font-black text-black transition hover:brightness-110">
          <FiHome /> Beranda
        </Link>
        <Link href="/search" className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white/80 transition hover:bg-white/[0.06]">
          <FiSearch /> Cari komik
        </Link>
        <Link href="/pustaka" className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white/80 transition hover:bg-white/[0.06]">
          <FiCompass /> Jelajahi
        </Link>
      </div>
    </main>
  );
}
