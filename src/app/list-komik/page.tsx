import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { permanentRedirect } from "next/navigation";
import { buildCanonicalUrl, buildComicUrl, normalizeSource } from "@/lib/canonicalUrl";
import type { ListKomikItem } from "@/types/content";

export const revalidate = 600;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type CatalogItem = ListKomikItem & { slug?: string };
type ListResponse = { data?: CatalogItem[]; meta?: { totalKomik?: number }; total?: number };
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] : input;
const slugFromLink = (link?: string) => (link || "").split("/").filter(Boolean).at(-1) || "";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams;
  const page = Math.max(1, Number(value(query.page)) || 1);
  const source = normalizeSource(value(query.source) || "komiku") || "komiku";
  const filtered = Boolean(value(query.huruf) || value(query.tipe));
  return {
    title: { absolute: `Daftar Komik Bahasa Indonesia${page > 1 ? ` Halaman ${page}` : ""} | Ryukomik` },
    description: "Jelajahi daftar manga, manhwa, dan manhua bahasa Indonesia beserta status dan chapter terbarunya di Ryukomik.",
    alternates: { canonical: buildCanonicalUrl("/list-komik", { page: page > 1 ? page : undefined, source: source !== "komiku" ? source : undefined }) },
    robots: { index: !filtered, follow: true },
  };
}

export default async function KomikList({ searchParams }: Props) {
  const query = await searchParams;
  const rawPage = value(query.page);
  const page = Math.max(1, Number(rawPage) || 1);
  const source = normalizeSource(value(query.source) || "komiku") || "komiku";
  if (rawPage === "1") permanentRedirect(source === "komiku" ? "/list-komik" : `/list-komik?source=${source}`);
  const params = new URLSearchParams({ page: String(page) });
  const huruf = value(query.huruf); const tipe = value(query.tipe);
  if (huruf) params.set("huruf", huruf); if (tipe) params.set("tipe", tipe);
  let payload: ListResponse = {};
  try {
    const endpoint = source === "project"
      ? `https://ryukomik.my.id/api/project/pustaka?${params}`
      : `https://api.ryukomik.web.id/${source}/list?${params}`;
    const response = await fetch(endpoint, { next: { revalidate: 600 } });
    if (response.ok) payload = await response.json();
  } catch {}
  const items = payload.data || [];
  const total = payload.meta?.totalKomik || payload.total || items.length;
  const pageUrl = (nextPage: number) => {
    const next = new URLSearchParams(); if (source !== "komiku") next.set("source", source); if (nextPage > 1) next.set("page", String(nextPage));
    return `/list-komik${next.size ? `?${next}` : ""}`;
  };
  return <main className="rk-page px-4 pb-24 pt-20"><div className="rk-shell">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">Catalog</p>
    <h1 className="mb-3 text-2xl font-black text-white">Daftar Komik Bahasa Indonesia</h1>
    <p className="mb-5 text-sm text-white/60">Total: <b>{total}</b> · Halaman {page}</p>
    {items.length ? <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{items.map((item, index) => {
      const href = buildComicUrl(source, item.slug || slugFromLink(item.link)).replace("https://ryukomik.my.id", "");
      return <Link key={`${href}-${index}`} href={href} className="group"><div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <Image src={item.image || "/icon.png"} alt={item.title} fill sizes="(max-width: 640px) 33vw, 16vw" className="object-cover" />
      </div><p className="mt-2 line-clamp-2 text-sm font-bold text-white/90 group-hover:text-cyan-100">{item.title}</p><p className="text-xs text-violet-200/70">{item.status}</p></Link>;
    })}</div> : <div className="rk-state rounded-2xl px-5 py-10 text-center text-white/60">Daftar komik belum tersedia.</div>}
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">{page > 1 && <Link rel="prev" href={pageUrl(page - 1)} className="rounded-xl px-4 py-2">Prev</Link>}<span className="text-sm text-white/60">Page {page}</span>{items.length > 0 && <Link rel="next" href={pageUrl(page + 1)} className="rounded-xl px-4 py-2">Next</Link>}</nav>
  </div></main>;
}
