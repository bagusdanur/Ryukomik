import SeriesCard from "@/components/SeriesCard";
import type { UpdateItem } from "@/types/content";

const typeBadge = (typeGenre?: string) => {
  const type = typeGenre?.split(",")[0]?.trim().toLowerCase();
  if (type === "manhwa") return "KR";
  if (type === "manhua") return "CN";
  if (type === "manga") return "JP";
  if (type === "18+" || type === "adult") return "18+";
  return type?.slice(0, 3).toUpperCase();
};

export default function ProjectUpdateList({
  list = [],
}: {
  list?: UpdateItem[];
}) {
  return (
    <section className="mt-6 px-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/60">
            Official Project
          </p>
          <h2 className="rk-section-title text-xl font-black">Project Update</h2>
        </div>
        <a
          href="/terbaru"
          className="rk-chip rounded-full px-3 py-1.5 text-xs font-bold hover:border-violet-200/40 hover:text-violet-100"
        >
          View All
        </a>
      </div>

      {list.length === 0 ? (
        <div className="rk-state rounded-2xl px-4 py-8 text-center text-sm">
          Belum ada project update.
        </div>
      ) : (
        <div className="overflow-x-auto pb-3 no-scrollbar">
          <div className="grid auto-cols-[118px] grid-flow-col gap-3 sm:auto-cols-[138px] md:auto-cols-[150px]">
            {list.map((item) => (
              <SeriesCard
                key={item.slug}
                href={`/komik/project/${item.slug}`}
                source="project"
                title={item.title}
                image={item.image}
                badge={typeBadge(item.type_genre)}
                eyebrow={item.chapter_terbaru?.replace("Chapter", "Ch.")}
                meta={item.info}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
