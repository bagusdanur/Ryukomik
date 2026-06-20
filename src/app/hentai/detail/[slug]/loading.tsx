export default function Loading() {
  return (
    <div
      className="rk-page text-white pb-28 relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="relative z-10 max-w-lg mx-auto">
        <div className="px-5 pt-7 mb-5">
          <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
        </div>

        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078] animate-pulse" />
            <div className="h-2 w-16 bg-[#ff5078]/20 rounded animate-pulse" />
          </div>

          <div className="flex gap-4">
            <div className="relative shrink-0">
              <div className="w-[110px] aspect-[2/3] rounded-2xl bg-white/5 animate-pulse" />
            </div>

            <div className="flex-1 pt-1 space-y-3">
              <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />

              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                <div className="h-4 w-16 rounded-full bg-[#ff5078]/20 animate-pulse" />
                <div className="h-4 w-16 rounded-full bg-[#ff5078]/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 grid grid-cols-2 gap-2 mb-6">
          <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-12 rounded-2xl bg-[#ff5078]/20 animate-pulse" />
        </div>

        <div className="px-5 mb-6 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078] animate-pulse" />
            <div className="h-2 w-16 bg-[#ff5078]/20 rounded animate-pulse" />
          </div>
          <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
