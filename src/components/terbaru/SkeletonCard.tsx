export default function SkeletonCard() {
  return (
    <div>
      <div className="aspect-[3/4] rounded-2xl border border-white/[0.08] bg-white/10" />

      <div className="mt-2 space-y-1">
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}
