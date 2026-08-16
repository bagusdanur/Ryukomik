"use client";

import { useRouter } from "next/navigation";
import SeriesCard from "@/components/SeriesCard";
import { setPendingSource } from "@/store/pendingSource";
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
  const router = useRouter();

  return (
    <section className="mt-6 px-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/60">
            Official Project
          </p>
          <h2 className="rk-section-title text-xl font-black">Project Update</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setPendingSource("project");
            router.push("/terbaru");
          }}
          className="rk-chip rounded-full px-3 py-1.5 text-xs font-bold hover:border-violet-200/40 hover:text-violet-100 transition-colors duration-200"
        >
          View All
        </button>
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
                corner={
                  <>
                  {item.status?.toLowerCase() === "cancelled" ? (
                    <span className="absolute right-2 top-2 rounded-full border border-red-300/35 bg-red-500/85 px-2 py-0.5 text-[9px] font-black tracking-wide text-white shadow-lg">
                      CANCELLED
                    </span>
                  ) : null}
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
