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
      <div className="relative h-[300px] overflow-hidden sm:h-[360px]">
        <div className="h-full w-full animate-pulse bg-white/[.055]" />
        <div className="absolute inset-0 bg-[var(--background)]/76" />
        <div className="absolute left-4 right-4 top-4 z-20 flex justify-between">
          <div className="h-11 w-11 animate-pulse rounded-full bg-white/[.09]" />
          <div className="flex gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/[.09]" />
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/[.09]" />
          </div>
        </div>
      </div>

      <section className="rk-shell relative z-10 -mt-14 px-4">
        <div className="flex items-start gap-4">
          <div className="h-40 w-28 shrink-0 animate-pulse rounded-2xl border border-white/[.1] bg-white/[.09]" />
          <div className="min-w-0 flex-1 pt-2">
            <div className="h-6 w-11/12 animate-pulse rounded bg-white/[.09]" />
            <div className="mt-2 h-6 w-8/12 animate-pulse rounded bg-white/[.08]" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-white/[.08]" />
              <div className="h-5 w-24 animate-pulse rounded bg-white/[.06]" />
            </div>
            <div className="mt-2 flex gap-3">
              <div className="h-4 w-12 animate-pulse rounded bg-white/[.06]" />
              <div className="h-4 w-16 animate-pulse rounded bg-emerald-300/10" />
            </div>
            <div className="mt-4 h-10 w-32 animate-pulse rounded-xl bg-white/[.08]" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-white/[.07]" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-white/[.07]" />
          <div className="h-4 w-8/12 animate-pulse rounded bg-white/[.07]" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-7 w-20 animate-pulse rounded-full bg-white/[.07]"
            />
          ))}
        </div>
      </section>

      <section className="rk-shell mt-8 space-y-3 px-4">
        <div className="h-6 w-36 animate-pulse rounded bg-white/[.09]" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl border border-white/[.06] bg-white/[.04]"
          />
        ))}
      </section>
    </main>
  );
}
