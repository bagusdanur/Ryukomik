"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FolderPlus, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import LoginModal from "@/components/LoginModal";

type Collection = {
  id: string;
  name: string;
  items_count?: number;
};

type SaveToCollectionButtonProps = {
  slug: string;
  source?: string;
  title?: string;
  image?: string;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { "content-type": "application/json", authorization: `Bearer ${token}` };
}

/**
 * Simpan seri langsung ke koleksi dari halaman detail — tanpa harus
 * menekan "Favorit/Bookmark" dulu. Semua tulis ke API koleksi lokal.
 */
export default function SaveToCollectionButton({
  slug,
  source = "komiku",
  title,
  image,
}: SaveToCollectionButtonProps) {
  const { user } = useSupabaseUser();
  const [open, setOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) return;
    setLoading(true);
    try {
      const res = await fetch("/api/collections", { headers, cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { collections?: Collection[] };
      setCollections(Array.isArray(json.collections) ? json.collections : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && user) void loadCollections();
  }, [open, user, loadCollections]);

  const addTo = async (collectionId: string) => {
    const headers = await authHeaders();
    if (!headers) return;
    setPendingId(collectionId);
    setNotice(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          item: { source, slug, title: title || null, image: image || null },
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setNotice(json.error || "Gagal menyimpan ke koleksi.");
        return;
      }
      setSavedIds((prev) => (prev.includes(collectionId) ? prev : [...prev, collectionId]));
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? { ...c, items_count: (c.items_count || 0) + 1 } : c)),
      );
      setNotice("Tersimpan ke koleksi.");
    } catch {
      setNotice("Gagal menyimpan ke koleksi.");
    } finally {
      setPendingId(null);
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const headers = await authHeaders();
    if (!headers) return;
    setCreating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setNotice(json.error || "Gagal membuat koleksi.");
        return;
      }
      setNewName("");
      await loadCollections();
      await addTo(json.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!user) {
            setShowLogin(true);
            return;
          }
          setOpen(true);
        }}
        className="rk-chip flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors duration-200 hover:border-cyan-200/40 hover:text-cyan-100"
      >
        <FolderPlus size={16} />
        Simpan ke Koleksi
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rk-card w-full max-w-sm rounded-2xl p-5 text-white">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Simpan ke Koleksi</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-white/60 transition-colors hover:text-white"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-3 line-clamp-1 text-xs text-white/60">{title || slug}</p>

            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-white/60">
                <Loader2 size={16} className="animate-spin" />
                Memuat koleksi...
              </div>
            ) : collections.length === 0 ? (
              <p className="py-3 text-sm text-white/60">
                Belum ada koleksi. Buat yang pertama di bawah.
              </p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {collections.map((collection) => {
                  const saved = savedIds.includes(collection.id);
                  return (
                    <button
                      key={collection.id}
                      onClick={() => (saved ? undefined : addTo(collection.id))}
                      disabled={saved || pendingId === collection.id}
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition-colors hover:border-cyan-200/30 disabled:opacity-70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{collection.name}</span>
                        <span className="block text-[11px] text-white/50">
                          {collection.items_count || 0} item
                        </span>
                      </span>
                      {saved ? (
                        <Check size={16} className="text-emerald-300" />
                      ) : pendingId === collection.id ? (
                        <Loader2 size={16} className="animate-spin text-cyan-200" />
                      ) : (
                        <Plus size={16} className="text-cyan-200" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value.slice(0, 120))}
                placeholder="Koleksi baru..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-200/40"
              />
              <button
                onClick={createAndAdd}
                disabled={creating || !newName.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-bold text-black transition-colors hover:bg-cyan-400 disabled:opacity-50"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Buat
              </button>
            </div>

            {notice && <p className="mt-3 text-xs text-cyan-200">{notice}</p>}
          </div>
        </div>
      )}

      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </>
  );
}
