import type { Metadata } from "next";
import Link from "next/link";
import { nekoImg } from "@/utils/neko";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Tonton Anime, Donghua & Anime Dewasa Sub Indo - Ryukomik",
  description:
    "Pusat tontonan Ryukomik: anime terbaru, donghua (anime China), dan anime dewasa sub indo dalam satu halaman.",
  alternates: { canonical: "https://ryukomik.my.id/tonton" },
};

type WatchItem = {
  title?: string;
  thumbnail?: string;
  slug?: string;
  latestEpisode?: string | number | null;
  episode?: string | number | null;
  episodeLabel?: string | null;
  tag?: string | null;
};

type Section = {
  key: "anime" | "donghua" | "hentai";
  label: string;
  caption: string;
  href: string;
  detailBase: string;
  accent: string;
  badge?: string;
  items: WatchItem[];
};

async function fetchLatest(url: string): Promise<WatchItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: WatchItem[] };
    return Array.isArray(json.data) ? json.data.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function episodeLabel(item: WatchItem): string {
  if (item.episodeLabel) return String(item.episodeLabel);
  if (item.episode) return `Eps ${item.episode}`;
  if (item.latestEpisode) return `Eps ${item.latestEpisode}`;
  return item.tag ? String(item.tag) : "Baru";
}

export default async function TontonPage() {
  const [anime, donghua, hentai] = await Promise.all([
    fetchLatest("https://apiv2.ryukomik.web.id/animeid/terbaru"),
    fetchLatest("https://apiv2.ryukomik.web.id/anichin/terbaru"),
    fetchLatest("https://apiv2.ryukomik.web.id/nekopoi/terbaru?page=1"),
  ]);

  const sections: Section[] = [
    {
      key: "anime",
      label: "Anime",
      caption: "Anime Jepang sub indo terbaru",
      href: "/anime/terbaru",
      detailBase: "/anime/detail",
      accent: "from-cyan-500/20 to-blue-500/5",
      items: anime,
    },
    {
      key: "donghua",
      label: "Donghua",
      caption: "Animasi China sub indo terbaru",
      href: "/donghua/terbaru",
      detailBase: "/donghua/detail",
      accent: "from-violet-500/20 to-fuchsia-500/5",
      items: donghua,
    },
    {
      key: "hentai",
      label: "Dewasa",
      caption: "Anime dewasa sub indo (18+)",
      href: "/hentai/terbaru",
      detailBase: "/hentai/detail",
      accent: "from-rose-500/20 to-orange-500/5",
      badge: "18+",
      items: hentai,
    },
  ];

  return (
    <main className="rk-page min-h-screen pb-28 text-white">
      <div className="rk-shell px-4 pt-6">
        <h1 className="text-2xl font-black tracking-tight">Tonton</h1>
        <p className="mt-1 text-xs text-white/50">
          Anime, donghua, dan anime dewasa — semua update terbaru dalam satu tempat.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {sections.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className={`rounded-2xl border border-white/10 bg-gradient-to-br ${section.accent} px-3 py-4 text-center transition hover:border-white/25`}
            >
              <span className="block text-sm font-black">{section.label}</span>
              <span className="mt-1 block text-[10px] leading-tight text-white/50">
                {section.key === "anime" ? "Jepang" : section.key === "donghua" ? "China" : "18+"}
              </span>
            </Link>
          ))}
        </div>

        {sections.map((section) => (
          <section key={section.key} className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black">
                  {section.label}
                  {section.badge ? (
                    <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-black text-rose-300">
                      {section.badge}
                    </span>
                  ) : null}
                </h2>
                <p className="text-[11px] text-white/40">{section.caption}</p>
              </div>
              <Link href={section.href} className="text-[11px] font-bold text-[var(--accent-2)] hover:text-white">
                Lihat semua
              </Link>
            </div>

            {section.items.length === 0 ? (
              <p className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs text-white/40">
                Belum ada update. Coba lagi beberapa saat.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {section.items.map((item) => {
                  const thumb =
                    section.key === "hentai"
                      ? nekoImg(item.thumbnail)
                      : item.thumbnail || "";
                  return (
                    <Link
                      key={`${section.key}-${item.slug}`}
                      href={`${section.detailBase}/${item.slug}`}
                      className="group overflow-hidden rounded-xl border border-white/10 bg-white/[.03] transition hover:border-white/25"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={item.title || section.label}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : null}
                        <span className="absolute bottom-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-black text-white/80">
                          {episodeLabel(item)}
                        </span>
                      </div>
                      <p className="line-clamp-2 px-2 py-2 text-[11px] font-semibold leading-snug text-white/80">
                        {item.title}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
