"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FiFolder, FiGrid } from "react-icons/fi";
import { getProxiedThumbnailUrl } from "@/lib/imageProxy";

type CollectionItem = {
  source?: string;
  slug?: string;
  image?: string;
  title?: string;
};

type PublicCollection = {
  id?: string;
  name?: string;
  user_collection_items?: CollectionItem[];
};

type PublicCollectionsTabsProps = {
  collections?: PublicCollection[];
};

export default function PublicCollectionsTabs({
  collections = [],
}: PublicCollectionsTabsProps) {
  const visibleCollections = useMemo(
    () => collections.filter((collection) => collection?.id),
    [collections],
  );
  const [activeId, setActiveId] = useState<string | null>(
    visibleCollections[0]?.id || null,
  );

  if (!visibleCollections.length) return null;

  const activeCollection =
    visibleCollections.find((collection) => collection.id === activeId) ||
    visibleCollections[0];
  const items = activeCollection?.user_collection_items || [];

  return (
    <section className="mt-8 max-w-full overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:color-mix(in_srgb,var(--accent-2)_60%,transparent)]">
          Koleksi Publik
        </p>
        <div className="flex min-w-0 items-center gap-1 truncate text-[10px] text-white/30">
          <FiFolder className="shrink-0" />
          <span className="truncate">Bisa dilihat publik</span>
        </div>
      </div>

      <div className="-mx-1 mb-3 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
        {visibleCollections.map((collection) => {
          const isActive = collection.id === activeCollection.id;

          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => setActiveId(collection.id)}
              className={`max-w-[180px] shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                isActive
                  ? "border-[color:color-mix(in_srgb,var(--accent-2)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)]"
                  : "border-white/[0.08] bg-white/[0.04] text-white/55"
              }`}
            >
              <span className="block truncate text-xs font-black">
                {collection.name ?? "Koleksi"}
              </span>
              <span className="mt-0.5 block text-[10px] text-white/40">
                {(collection.user_collection_items || []).length} komik
              </span>
            </button>
          );
        })}
      </div>

      <article className="rk-card-soft max-w-full overflow-hidden rounded-2xl border border-white/[0.07] p-3">
        <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white">
              {activeCollection.name ?? "Koleksi"}
            </h2>
            <p className="mt-0.5 text-[11px] text-white/40">{items.length} komik</p>
          </div>
          <FiFolder className="mt-0.5 shrink-0 text-[color:color-mix(in_srgb,var(--accent-2)_70%,transparent)]" />
        </div>

        {items.length ? (
          <div className="-mx-1 flex max-w-full gap-3 overflow-x-auto px-1 pb-2">
            {items.slice(0, 10).map((item) => (
              <div
                key={`${activeCollection.id}-${item.source}-${item.slug}`}
                className="w-[96px] shrink-0 sm:w-[112px]"
              >
                <Link
                  href={`/komik/${item.source || "komiku"}/${item.slug ?? ""}`}
                  className="group block min-w-0"
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                    {item.image ? (
                      <img
                        src={getProxiedThumbnailUrl(item.image, item.source)}
                        alt={item.title ?? "Komik"}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/25">
                        <FiGrid />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[32px] text-[11px] font-bold leading-snug text-white/70 group-hover:text-[var(--accent-2)]">
                    {item.title}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.1] py-6 text-center text-xs text-white/35">
            Koleksi ini belum ada isi.
          </div>
        )}
      </article>
    </section>
  );
}
