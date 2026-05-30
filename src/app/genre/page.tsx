import { GENRES } from "@/data/genres";

export default function GenrePage() {
  return (
    <div className="rk-page rk-app-surface px-4 pb-24 pt-20">
      <div className="rk-shell">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
          Browse
        </p>
        <h1 className="text-2xl font-black text-white">Daftar Genre</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {GENRES.map((g) => (
          <a
            key={g}
            href={`/genre/${g.toLowerCase().replace(/\s+/g, "-")}`}
            className="rk-card-soft rounded-2xl p-3 text-center text-sm font-semibold text-white/80 transition hover:border-cyan-200/20 hover:text-cyan-100"
          >
            {g}
          </a>
        ))}
      </div>
      </div>
    </div>
  );
}
