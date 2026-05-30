export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-white">
      <div className="fixed left-0 right-0 top-0 z-10 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
        <div className="mx-auto h-4 w-48 animate-pulse rounded bg-white/[.08]" />
      </div>

      <div className="mx-auto w-full max-w-[520px] pt-12">
        <div className="h-28 w-full animate-pulse border-y border-cyan-300/10 bg-white/[.055] sm:mt-4 sm:rounded-lg sm:border" />

        <div className="space-y-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[520px] w-full items-center justify-center bg-[#05060b]"
            >
              <div className="h-[88%] w-[92%] animate-pulse rounded bg-white/[.045]" />
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-5 left-1/2 z-10 h-14 w-52 -translate-x-1/2 animate-pulse rounded-full border border-white/10 bg-white/[.07]" />
    </main>
  );
}
