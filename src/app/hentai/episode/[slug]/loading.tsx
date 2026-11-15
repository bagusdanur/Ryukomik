export default function Loading() {
  return (
    <div
      className="rk-page text-white pb-28"
      style={{ fontFamily: "'Syne', sans-serif" }}
    >
      <div className="w-full bg-[#0a0a0a] relative">
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/5 animate-pulse">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-[#ff5078] animate-spin" style={{ animationDuration: "3s" }} />
              <div className="absolute inset-3 rounded-full bg-[#ff5078]/20" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ff5078]/60">
              Memuat episode
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-5">
        <div className="mb-4 space-y-2">
          <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-1/3 bg-white/5 rounded animate-pulse" />
        </div>

        <div className="flex gap-2 mb-5">
          <div className="h-6 w-16 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-6 w-16 bg-white/10 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="h-11 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-11 rounded-2xl bg-[#ff5078]/10 animate-pulse" />
          <div className="h-11 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
