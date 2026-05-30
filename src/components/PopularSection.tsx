"use client";

import { useEffect, useState } from "react";
import SeriesCard from "@/components/SeriesCard";

const SOURCE_API_BASE_URL = "https://mgkomik-backend-three.vercel.app";

type PopularItem = {
  link: string;
  image?: string;
  title?: string;
  type?: string;
  genre?: string;
  chapter_terbaru?: string;
};

type PopularData = {
  manga: PopularItem[];
  manhwa: PopularItem[];
  manhua: PopularItem[];
};

type PopularResponse = {
  data?: {
    populer_manga?: PopularItem[];
    populer_manhwa?: PopularItem[];
    populer_manhua?: PopularItem[];
  };
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

export default function PopularSection({
  data: initialData,
}: {
  data?: Partial<PopularData>;
}) {
  const [data, setData] = useState<PopularData>({
    manga: initialData?.manga || [],
    manhwa: initialData?.manhwa || [],
    manhua: initialData?.manhua || [],
  });
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    async function fetchPopular() {
      if (initialData) return;

      try {
        const res = await fetch(`${SOURCE_API_BASE_URL}/komiku/home`);
        const json = (await res.json()) as PopularResponse;

        setData({
          manga: json?.data?.populer_manga || [],
          manhwa: json?.data?.populer_manhwa || [],
          manhua: json?.data?.populer_manhua || [],
        });
      } catch (e) {
        console.error("Popular fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPopular();
  }, [initialData]);

  if (loading) {
    return (
      <div className="mx-3 mt-7 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="rk-cover-frame animate-pulse" />
            <div className="h-3 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {Object.entries(data).map(([type, list]) => (
        <section key={type} className="mt-7 px-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/60">
                Popular Picks
              </p>
              <h3 className="rk-section-title text-xl font-black capitalize">{type}</h3>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="rk-state rounded-2xl px-4 py-8 text-center text-sm">
              Belum ada data populer.
            </div>
          ) : (
            <div className="overflow-x-auto pb-3 no-scrollbar">
              <div className="grid auto-cols-[118px] grid-flow-col gap-3 sm:auto-cols-[138px] md:auto-cols-[150px]">
                {list.map((item, idx) => {
                  const slug = getSlugFromLink(item.link);

                  return (
                    <SeriesCard
                      key={`${slug}-${idx}`}
                      href={`/komik/komiku/${slug}`}
                      title={item.title}
                      image={item.image}
                      badge={typeBadge(item.type)}
                      eyebrow={item.chapter_terbaru}
                      meta={item.genre}
                      corner={
                        <span className="rk-cover-badge absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black text-[var(--accent)]">
                          HOT
                        </span>
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ))}
    </>
  );
}
