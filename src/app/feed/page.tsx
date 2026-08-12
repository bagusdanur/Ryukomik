import SocialTimeline from "@/components/social/SocialTimeline";

export const dynamic = "force-dynamic";

export default function FeedPage() {
  return (
    <main className="rk-page px-0 pb-28 pt-16 text-white sm:px-4 sm:pt-20">
      <div className="rk-shell max-w-2xl">
        <div className="mb-4 px-4 sm:px-0">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200/60">Community</p>
          <h1 className="text-2xl font-black">Timeline Ryukomik</h1>
        </div>
        <SocialTimeline />
      </div>
    </main>
  );
}
