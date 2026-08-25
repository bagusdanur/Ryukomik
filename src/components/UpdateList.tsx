"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SeriesCard from "@/components/SeriesCard";
import { setPendingSource } from "@/store/pendingSource";

type UpdateListItem = {
  link: string;
  image?: string;
  title?: string;
  type?: string;
  up?: string;
  chapter_terbaru?: string;
  waktu?: string;
};

const getSlugFromLink = (url: string) => {
  const parts = url.split("/");
  return parts[parts.length - 2];
};

const typeBadge = (type?: string) => {
  if (type === "Manhwa") return "KR";
  if (type === "Manhua") return "CN";
  if (type === "Manga") return "JP";
  return type?.slice(0, 3).toUpperCase();
};

export default function UpdateList({ list = [] }: { list?: UpdateListItem[] }) {
  const router = useRouter();
  const [retryItems, setRetryItems] = useState<UpdateListItem[]>([]);

  useEffect(() => {
    if (list.length) return;

    let cancelled = false;
    void fetch("/api/source/komiku/terbaru", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((payload: { data?: UpdateListItem[] }) => {
        if (!cancelled && Array.isArray(payload.data) && payload.data.length) setRetryItems(payload.data);
      })
      .catch((error) => console.error("Latest update retry failed:", error));

    return () => { cancelled = true; };
  }, [list]);

  const items = list.length ? list : retryItems;

  return (
    <section className="mt-6 px-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
            Fresh Chapter
          </p>
          <h3 className="rk-section-title text-xl font-black">Update</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setPendingSource("josei");
            router.push("/terbaru");
          }}
          className="rk-chip rounded-full px-3 py-1.5 text-xs font-bold hover:border-cyan-200/40 hover:text-cyan-100 transition-colors duration-200"
        >
          View All
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rk-state rounded-2xl px-4 py-8 text-center text-sm">
          Belum ada update.
        </div>
      ) : (
        <div className="overflow-x-auto pb-3 no-scrollbar">
          <div className="grid auto-cols-[118px] grid-flow-col gap-3 sm:auto-cols-[138px] md:auto-cols-[150px]">
            {items.map((item, idx) => {
              const slug = getSlugFromLink(item.link);

              return (
                <SeriesCard
                  key={`${slug}-${idx}`}
                  href={`/komik/komiku/${slug}`}
                  title={item.title}
                  image={item.image}
                  badge={typeBadge(item.type)}
                  eyebrow={item.chapter_terbaru}
                  meta={item.waktu}
                  corner={
                    item.up ? (
                      <span className="rk-cover-badge absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-[var(--accent-2)]">
                        {item.up}
                      </span>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
