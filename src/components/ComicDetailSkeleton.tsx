type ComicDetailSkeletonProps = {
  overlay?: boolean;
};

export default function ComicDetailSkeleton({
  overlay = false,
}: ComicDetailSkeletonProps) {
  return (
    <main
      aria-busy="true"
      aria-label="Memuat detail komik"
      className={
        overlay
          ? "fixed inset-0 z-[100] min-h-screen overflow-y-auto bg-[var(--background)] pb-28 text-white"
          : "rk-page min-h-screen bg-[var(--background)] pb-28 text-white"
      }
    >
      <section className="rk-shell px-4 pt-6">
        <div className="flex gap-4">
          <div className="h-44 w-32 shrink-0 animate-pulse rounded-lg bg-white/[.07]" />
          <div className="min-w-0 flex-1 pt-1">
            <div className="h-4 w-24 animate-pulse rounded bg-cyan-300/15" />
            <div className="mt-3 h-7 w-11/12 animate-pulse rounded bg-white/[.08]" />
            <div className="mt-2 h-7 w-8/12 animate-pulse rounded bg-white/[.08]" />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="h-9 animate-pulse rounded-lg bg-white/[.07]" />
              <div className="h-9 animate-pulse rounded-lg bg-white/[.07]" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-7 w-20 animate-pulse rounded-full bg-white/[.06]"
            />
          ))}
        </div>

        <div className="mt-7 space-y-3">
          <div className="h-5 w-36 animate-pulse rounded bg-white/[.08]" />
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[.035] p-3"
            >
              <div className="h-10 w-10 animate-pulse rounded-lg bg-white/[.07]" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-8/12 animate-pulse rounded bg-white/[.08]" />
                <div className="mt-2 h-3 w-5/12 animate-pulse rounded bg-white/[.05]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
