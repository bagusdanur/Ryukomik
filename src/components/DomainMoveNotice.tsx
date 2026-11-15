import Link from "next/link";
import { FiArrowRight, FiGlobe } from "react-icons/fi";

/**
 * Pemberitahuan pindah domain di beranda.
 *
 * Diletakkan tepat di bawah "Lanjut Baca" — pembaca yang baru kembali dari
 * bookmark lama adalah orang yang paling perlu tahu alamat baru, dan posisi itu
 * yang paling sering dilihat sebelum mereka memilih chapter.
 */
export default function DomainMoveNotice() {
  return (
    <Link
      href="/info/domain-baru"
      className="group mx-3 mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,.10),rgba(139,92,246,.10))] px-3.5 py-3 transition hover:border-cyan-300/40 hover:from-cyan-300/[.14] hover:to-violet-400/[.14]"
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/25">
        <FiGlobe size={17} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(34,211,238,.6)]" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] font-black text-white">
            Ryukomik pindah ke ryukomik.com
          </span>
          <span className="shrink-0 rounded-full bg-cyan-300/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-cyan-200">
            Baru
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] leading-relaxed text-white/55">
          Alamat lama sudah tidak aktif — cara update bookmark
        </span>
      </span>

      <span className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/[.06] px-2.5 text-[10.5px] font-black text-cyan-100 transition group-hover:bg-cyan-300 group-hover:text-black">
        Baca
        <FiArrowRight size={12} />
      </span>
    </Link>
  );
}
