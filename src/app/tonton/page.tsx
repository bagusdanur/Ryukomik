import type { Metadata } from "next";
import Link from "next/link";
import AdultGate from "@/components/anime/AdultGate";
import ContinueWatching from "@/components/anime/ContinueWatching";
import { nekoImg } from "@/utils/neko";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Tonton Anime, Donghua & Anime Dewasa Sub Indo - Ryukomik",
  description:
    "Pusat tontonan Ryukomik: anime terbaru, donghua (animasi China), dan anime dewasa sub indo dalam satu halaman.",
  alternates: { canonical: "https://ryukomik.my.id/tonton" },
};

type WatchItem = {
  title?: string;
  thumbnail?: string;
  slug?: string;
  latestEpisode?: string | number | null;
  episode?: string | number | null;
  isMovie?: boolean;
  tag?: string | null;
  subDub?: string | null;
  status?: string | null;
};

type SectionConfig = {
  key: "anime" | "donghua" | "dewasa";
  label: string;
  caption: string;
  href: string;
  episodeBase: string;
  badgeBg: string;
  items: WatchItem[];
};

async function fetchLatest(url: string): Promise<WatchItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: WatchItem[] };
    return Array.isArray(json.data) ? json.data.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function episodeBadge(item: WatchItem): string {
  if (item.isMovie) return "MOVIE";
  const value = item.episode ?? item.latestEpisode;
  if (value !== null && value !== undefined && String(value).trim() !== "") return `EP ${value}`;
  return item.tag ? String(item.tag).slice(0, 14) : "BARU";
}

function CardGrid({ section }: { section: SectionConfig }) {
  if (section.items.length === 0) {
    return (
      <p className="mx-5 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-white/40">
        Belum ada update. Coba lagi beberapa saat.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 px-5">
      {section.items.map((item) => {
        const thumb = section.key === "dewasa" ? nekoImg(item.thumbnail) : item.thumbnail || "";
        return (
          <Link
            prefetch={false}
            href={`${section.episodeBase}/${item.slug}`}
            key={`${section.key}-${item.slug}`}
            className="rk-card-soft group block overflow-hidden rounded-2xl"
          >
            <div className="relative" style={{ aspectRatio: "2/3" }}>
              <img src={thumb} alt={item.title || section.label} loading="lazy" decoding="async" className="h-full w-full object-cover" />

              <div className="absolute left-1.5 top-1.5">
                <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ background: section.badgeBg }}>
                  <span className="text-[8px] font-black leading-none tracking-wide text-black">{episodeBadge(item)}</span>
                </div>
              </div>

              {item.status === "Completed" ? (
                <div className="absolute right-1.5 top-1.5 rounded-md border border-white/10 bg-black/60 px-1 py-0.5">
                  <span className="text-[7px] font-bold leading-none tracking-wide text-white/60">END</span>
                </div>
              ) : null}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                <div className="mb-0.5 flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full" style={{ background: item.status === "Completed" ? "#888" : "#4ade80" }} />
                  <span className="text-[7px] font-semibold uppercase tracking-widest text-white/40">
                    {item.subDub || (section.key === "dewasa" ? "Sub Indo" : "Sub Indo")}
                  </span>
                </div>
                <p className="line-clamp-2 text-[10px] font-bold leading-snug text-white">{item.title}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function TontonPage() {
  const [anime, donghua, dewasa] = await Promise.all([
    fetchLatest("https://apiv2.ryukomik.web.id/animeid/terbaru"),
    fetchLatest("https://apiv2.ryukomik.web.id/anichin/terbaru"),
    fetchLatest("https://apiv2.ryukomik.web.id/nekopoi/terbaru?page=1"),
  ]);

  const sections: SectionConfig[] = [
    {
      key: "anime",
      label: "Anime",
      caption: "Anime Jepang sub indo terbaru",
      href: "/anime/terbaru",
      // animeid/terbaru mengembalikan slug SERI (bukan episode).
      episodeBase: "/anime/detail",
      badgeBg: "#22d3ee",
      items: anime,
    },
    {
      key: "donghua",
      label: "Donghua",
      caption: "Animasi China sub indo terbaru",
      href: "/donghua/terbaru",
      episodeBase: "/donghua/episode",
      badgeBg: "#ff9f1c",
      items: donghua,
    },
    {
      key: "dewasa",
      label: "Dewasa",
      caption: "Anime dewasa sub indo (18+)",
      href: "/hentai/terbaru",
      episodeBase: "/hentai/episode",
      badgeBg: "#ff5078",
      items: dewasa,
    },
  ];

  return (
    <div className="pb-28 text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="px-5 pt-4">
        <h1 className="text-xl font-black tracking-tight">Tonton</h1>
        <p className="mt-1 text-[11px] text-white/40">
          Anime, donghua, dan anime dewasa — update terbaru dalam satu tempat.
        </p>
      </div>

      <ContinueWatching />

      {sections.map((section) => {
        const block = (
          <section key={section.key} id={section.key} className="mt-7 scroll-mt-28">
            <div className="mb-3 flex items-end justify-between gap-3 px-5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black">
                  {section.label}
                  {section.key === "dewasa" ? (
                    <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-black text-rose-300">18+</span>
                  ) : null}
                </h2>
                <p className="text-[10px] text-white/35">{section.caption}</p>
              </div>
              <Link href={section.href} className="text-[10px] font-bold uppercase tracking-widest text-white/45 transition hover:text-white">
                Lihat semua
              </Link>
            </div>

            <CardGrid section={section} />
          </section>
        );

        // Section dewasa (termasuk judulnya) baru muncul setelah konfirmasi 18+;
        // menekan "Batal" menghilangkan seluruh section dari halaman.
        return section.key === "dewasa" ? <AdultGate key={section.key}>{block}</AdultGate> : block;
      })}
    </div>
  );
}
