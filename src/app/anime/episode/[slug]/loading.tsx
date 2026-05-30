export default function Loading() {
  return (
    <div
      className="min-h-screen bg-[#282828] text-white"
      style={{ fontFamily: "'Syne', sans-serif" }}
    >
      <div className="w-full bg-[#0a0a0a]">
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-[#7d5fff]" />
              <div className="absolute inset-3 rounded-full bg-[#7d5fff]/20" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">
              Memuat episode
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-5 mt-5 space-y-2">
          <div className="h-4 w-4/5 rounded bg-white/10" />
          <div className="h-3 w-40 rounded bg-white/5" />
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="h-11 rounded-2xl bg-white/5" />
          <div className="h-11 rounded-2xl bg-[#7d5fff]/10" />
          <div className="h-11 rounded-2xl bg-white/5" />
        </div>

        <div className="h-px bg-white/[0.04]" />
      </div>
    </div>
  );
}
