"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiFolder,
  FiGlobe,
  FiGrid,
  FiLock,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const COLLECTION_KEY = "comic_collections";

type BookmarkItem = {
  slug: string;
  source?: string;
  title?: string;
  image?: string;
};

type NormalizedBookmark = {
  slug: string;
  source: string;
  title: string;
  image: string;
};

type ComicCollection = {
  id: string;
  name: string;
  is_public?: boolean;
  items: NormalizedBookmark[];
  createdAt?: number;
  updatedAt?: number;
};

type CloudCollectionRow = {
  id: string;
  name: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
};

type CloudCollectionItemRow = BookmarkItem & {
  collection_id: string;
  position?: number;
  created_at?: string;
};

type CollectionTabProps = {
  search?: string;
};

function makeId() {
  return `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBookmark(item: BookmarkItem): NormalizedBookmark {
  return {
    slug: item.slug,
    source: item.source === "doujindesu" ? "sekte" : item.source || "komiku",
    title: item.title || "Unknown",
    image: item.image || "",
  };
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCloudCollection(
  collection: CloudCollectionRow,
  itemsByCollection: Map<string, NormalizedBookmark[]>,
): ComicCollection {
  return {
    id: collection.id,
    name: collection.name,
    is_public: collection.is_public,
    items: itemsByCollection.get(collection.id) || [],
    createdAt: new Date(collection.created_at).getTime(),
    updatedAt: new Date(collection.updated_at).getTime(),
  };
}

export default function CollectionTab({ search = "" }: CollectionTabProps) {
  const [collections, setCollections] = useState<ComicCollection[]>([]);
  const [bookmarks, setBookmarks] = useState<NormalizedBookmark[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLocalCollections, setHasLocalCollections] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user || null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadCollections();
    window.addEventListener("bookmark-updated", loadCollections);
    return () => window.removeEventListener("bookmark-updated", loadCollections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadCollections() {
    const savedBookmarks = readJSON<BookmarkItem[]>("bookmarks", []).map(normalizeBookmark);
    const localCollections = readJSON<ComicCollection[]>(COLLECTION_KEY, []);
    setBookmarks(savedBookmarks);
    setHasLocalCollections(localCollections.length > 0);
    setLoading(true);

    if (!user?.id) {
      setCloudReady(false);
      setCollections(localCollections);
      syncActiveCollection(localCollections);
      setLoading(false);
      return;
    }

    const { data: cloudCollections, error } = await supabase
      .from("user_collections")
      .select("id, name, is_public, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      setCloudReady(false);
      setCollections(localCollections);
      syncActiveCollection(localCollections);
      setLoading(false);
      return;
    }

    const collectionRows = (cloudCollections || []) as CloudCollectionRow[];
    const collectionIds = collectionRows.map((item) => item.id);
    const { data: cloudItems } = collectionIds.length
      ? await supabase
          .from("user_collection_items")
          .select("collection_id, source, slug, title, image, position, created_at")
          .in("collection_id", collectionIds)
          .order("position", { ascending: true })
          .order("created_at", { ascending: false })
      : { data: [] };

    const itemsByCollection = new Map<string, NormalizedBookmark[]>();
    ((cloudItems || []) as CloudCollectionItemRow[]).forEach((item) => {
      const list = itemsByCollection.get(item.collection_id) || [];
      list.push(normalizeBookmark(item));
      itemsByCollection.set(item.collection_id, list);
    });

    const normalized = collectionRows.map((collection) =>
      normalizeCloudCollection(collection, itemsByCollection),
    );

    setCloudReady(true);
    setCollections(normalized);
    syncActiveCollection(normalized);
    setLoading(false);
  }

  function syncActiveCollection(nextCollections: ComicCollection[]) {
    setActiveId((current) => {
      if (current && nextCollections.some((item) => item.id === current)) {
        return current;
      }
      return nextCollections[0]?.id || null;
    });
  }

  function saveLocalCollections(next: ComicCollection[]) {
    setCollections(next);
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(next));
    syncActiveCollection(next);
  }

  async function migrateLocalCollections() {
    if (!user?.id || !cloudReady) return;
    const localCollections = readJSON<ComicCollection[]>(COLLECTION_KEY, []);
    if (localCollections.length === 0) return;

    for (const collection of localCollections) {
      const { data: inserted } = await supabase
        .from("user_collections")
        .insert({
          user_id: user.id,
          name: collection.name,
          is_public: collection.is_public !== false,
        })
        .select("id")
        .single();

      if (inserted?.id && collection.items?.length) {
        await supabase.from("user_collection_items").insert(
          collection.items.map((item, index) => ({
            collection_id: inserted.id,
            user_id: user.id,
            ...normalizeBookmark(item),
            position: index,
          })),
        );
      }
    }

    localStorage.removeItem(COLLECTION_KEY);
    await loadCollections();
  }

  const activeCollection = useMemo(
    () => collections.find((item) => item.id === activeId) || null,
    [activeId, collections],
  );

  const filteredCollections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;

    return collections.filter((collection) => {
      const itemText = collection.items
        ?.map((item) => item.title)
        .join(" ")
        .toLowerCase();
      return collection.name.toLowerCase().includes(q) || itemText?.includes(q);
    });
  }, [collections, search]);

  const filteredItems = useMemo(() => {
    const items = activeCollection?.items || [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [activeCollection, search]);

  const availableBookmarks = useMemo(() => {
    const selected = new Set(
      activeCollection?.items?.map((item) => `${item.source}:${item.slug}`) || [],
    );
    return bookmarks.filter((item) => !selected.has(`${item.source}:${item.slug}`));
  }, [activeCollection, bookmarks]);

  async function createCollection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    if (cloudReady && user?.id) {
      const { data } = await supabase
        .from("user_collections")
        .insert({ user_id: user.id, name, is_public: true })
        .select("id")
        .single();
      setNewName("");
      if (data?.id) setActiveId(data.id);
      await loadCollections();
      return;
    }

    const now = Date.now();
    const collection = {
      id: makeId(),
      name,
      is_public: true,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    saveLocalCollections([collection, ...collections]);
    setActiveId(collection.id);
    setNewName("");
  }

  async function deleteCollection(id: string) {
    if (cloudReady && user?.id) {
      await supabase.from("user_collections").delete().eq("id", id).eq("user_id", user.id);
      await loadCollections();
      return;
    }

    saveLocalCollections(collections.filter((item) => item.id !== id));
  }

  async function addBookmark(item: BookmarkItem) {
    if (!activeCollection) return;
    const normalized = normalizeBookmark(item);

    if (cloudReady && user?.id) {
      await supabase.from("user_collection_items").insert({
        collection_id: activeCollection.id,
        user_id: user.id,
        ...normalized,
        position: 0,
      });
      await supabase
        .from("user_collections")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeCollection.id)
        .eq("user_id", user.id);
      await loadCollections();
      return;
    }

    const next = collections.map((collection) => {
      if (collection.id !== activeCollection.id) return collection;
      return {
        ...collection,
        items: [normalized, ...(collection.items || [])],
        updatedAt: Date.now(),
      };
    });

    saveLocalCollections(next);
  }

  async function removeItem(item: NormalizedBookmark) {
    if (!activeCollection) return;

    if (cloudReady && user?.id) {
      await supabase
        .from("user_collection_items")
        .delete()
        .eq("collection_id", activeCollection.id)
        .eq("user_id", user.id)
        .eq("source", item.source || "komiku")
        .eq("slug", item.slug);
      await loadCollections();
      return;
    }

    const next = collections.map((collection) => {
      if (collection.id !== activeCollection.id) return collection;
      return {
        ...collection,
        items: (collection.items || []).filter(
          (saved) =>
            saved.slug !== item.slug || (saved.source || "komiku") !== item.source,
        ),
        updatedAt: Date.now(),
      };
    });

    saveLocalCollections(next);
  }

  async function togglePublic(collection: ComicCollection) {
    const nextPublic = collection.is_public === false;

    if (cloudReady && user?.id) {
      await supabase
        .from("user_collections")
        .update({ is_public: nextPublic, updated_at: new Date().toISOString() })
        .eq("id", collection.id)
        .eq("user_id", user.id);
      await loadCollections();
      return;
    }

    saveLocalCollections(
      collections.map((item) =>
        item.id === collection.id ? { ...item, is_public: nextPublic } : item,
      ),
    );
  }

  if (loading) {
    return (
      <div className="rk-card-soft rounded-2xl py-10 text-center text-sm text-white/50">
        Memuat koleksi...
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="rk-card-soft rounded-2xl px-5 py-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,var(--accent-2)_15%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)]">
          <FiFolder size={26} />
        </div>
        <h2 className="text-center text-lg font-black">Buat koleksi pertama</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-white/55">
          {cloudReady
            ? "Koleksi akan tersimpan di akun dan bisa tampil di profil publik."
            : "Login untuk menyimpan koleksi ke cloud dan menampilkannya di profil publik."}
        </p>
        {hasLocalCollections && cloudReady && (
          <button
            onClick={migrateLocalCollections}
            className="rk-btn-ghost mx-auto mt-4 flex rounded-xl px-4 py-2 text-sm font-bold"
          >
            Import Koleksi Lokal
          </button>
        )}
        <form onSubmit={createCollection} className="mx-auto mt-6 flex max-w-sm gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama koleksi"
            className="rk-input min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm"
          />
          <button className="rk-btn-primary rounded-xl px-4 py-2.5 font-bold">
            <FiPlus />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasLocalCollections && cloudReady && (
        <button
          onClick={migrateLocalCollections}
          className="rk-btn-ghost w-full rounded-xl py-2 text-sm font-bold"
        >
          Import Koleksi Lokal ke Supabase
        </button>
      )}

      {!cloudReady && (
        <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--accent-3)_15%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-3)_10%,transparent)] px-4 py-3 text-xs text-[color:color-mix(in_srgb,var(--accent-3)_80%,white)]">
          Mode lokal aktif. Login dan jalankan SQL koleksi agar data tersimpan di Supabase.
        </div>
      )}

      <form onSubmit={createCollection} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Koleksi baru..."
          className="rk-input min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm"
        />
        <button className="rk-btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
          <FiPlus size={16} />
          Buat
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filteredCollections.map((collection) => (
          <button
            key={collection.id}
            onClick={() => setActiveId(collection.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeId === collection.id
                ? "border-[color:color-mix(in_srgb,var(--accent-2)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)]"
                : "border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white"
            }`}
          >
            <FiFolder size={15} />
            <span>{collection.name}</span>
            <span className="text-xs text-white/35">
              {collection.items?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {!activeCollection ? (
        <p className="rk-card-soft rounded-2xl py-10 text-center text-white/60">
          Koleksi tidak ditemukan
        </p>
      ) : (
        <div className="rk-card-soft rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black">{activeCollection.name}</h2>
              <p className="mt-0.5 text-xs text-white/45">
                {activeCollection.items?.length || 0} komik
              </p>
              <p className="mt-1 text-[11px] text-white/35">
                {activeCollection.is_public === false
                  ? "Disembunyikan dari profil publik"
                  : "Tampil di profil publik"}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => togglePublic(activeCollection)}
                className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                  activeCollection.is_public === false
                    ? "border-[color:color-mix(in_srgb,var(--accent-3)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-3)_10%,transparent)] text-[color:color-mix(in_srgb,var(--accent-3)_72%,white)]"
                    : "border-[color:color-mix(in_srgb,var(--accent-2)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-2)_10%,transparent)] text-[var(--accent-2)]"
                }`}
                title={
                  activeCollection.is_public === false
                    ? "Koleksi privat, tidak tampil di profil publik"
                    : "Koleksi publik, tampil di profil publik"
                }
              >
                {activeCollection.is_public === false ? (
                  <>
                    <FiLock size={15} />
                    Privat
                  </>
                ) : (
                  <>
                    <FiGlobe size={15} />
                    Publik
                  </>
                )}
              </button>
              <button
                onClick={() => setPickerOpen(true)}
                className="rk-btn-primary flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"
              >
                <FiPlus size={15} />
                Tambah
              </button>
              <button
                onClick={() => deleteCollection(activeCollection.id)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/55 hover:border-[color:color-mix(in_srgb,var(--accent-3)_30%,transparent)] hover:text-[var(--accent-3)]"
                title="Hapus koleksi"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.12] py-10 text-center text-sm text-white/50">
              Belum ada komik di koleksi ini
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {filteredItems.map((item) => (
                <div key={`${item.source}:${item.slug}`} className="group relative">
                  <button
                    onClick={() => removeItem(item)}
                    className="absolute left-2 top-2 z-10 rounded-full bg-[color:color-mix(in_srgb,var(--accent-3)_90%,black)] p-2 text-xs text-white"
                    title="Hapus dari koleksi"
                  >
                    <FiX />
                  </button>
                  <a href={`/komik/${item.source || "komiku"}/${item.slug}`}>
                    <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                      {item.image ? (
                        <img
                          referrerPolicy="no-referrer"
                          src={item.image}
                          className="h-full w-full object-cover"
                          alt={item.title}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/25">
                          <FiGrid size={24} />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-white/90 group-hover:text-[var(--accent-2)]">
                      {item.title}
                    </p>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 pb-24 sm:pb-4">
          <div className="rk-card max-h-[72vh] w-full max-w-lg overflow-hidden rounded-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
              <div>
                <h3 className="font-bold">Tambah dari Favorite</h3>
                <p className="mt-0.5 text-xs text-white/45">
                  {availableBookmarks.length} komik tersedia
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-white/60 hover:text-white"
              >
                <FiX />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {availableBookmarks.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/50">
                  Semua favorite sudah masuk koleksi ini
                </p>
              ) : (
                <div className="space-y-2">
                  {availableBookmarks.map((item) => (
                    <button
                      key={`${item.source}:${item.slug}`}
                      onClick={() => addBookmark(item)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[0.06]"
                    >
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                        {item.image && (
                          <img
                            referrerPolicy="no-referrer"
                            src={item.image}
                            className="h-full w-full object-cover"
                            alt={item.title}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">
                          {item.title}
                        </p>
                      </div>
                      <FiPlus className="shrink-0 text-[var(--accent-2)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
