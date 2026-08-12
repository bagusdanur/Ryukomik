"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  FiEdit3,
  FiHeart,
  FiLink,
  FiMessageCircle,
  FiMoreHorizontal,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { RiEmojiStickerLine } from "react-icons/ri";
import { socialFetch } from "@/lib/social/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { stickers } from "@/data/stickers";

type Author = { username?: string; avatar_url?: string | null; level?: number };
type Post = {
  id: string;
  author_id: string;
  content: string;
  image_url?: string | null;
  visibility: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  viewer_liked: boolean;
  viewer_owns: boolean;
  profiles?: Author | Author[] | null;
};

function authorOf(post: Post): Author {
  return Array.isArray(post.profiles)
    ? post.profiles[0] || {}
    : post.profiles || {};
}

function MediaPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"sticker" | "link">("sticker");
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState("");

  function addManualUrl() {
    const value = manualUrl.trim();
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:") throw new Error();
      onSelect(value);
      onClose();
    } catch {
      setError("Masukkan URL gambar HTTPS yang valid.");
    }
  }

  return (
    <div className="absolute bottom-12 left-0 z-30 w-[min(21rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-2)] p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="grid flex-1 grid-cols-2 rounded-xl bg-black/25 p-1">
          {(["sticker", "link"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTab(item);
                setError("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition ${tab === item ? "bg-[var(--accent)]/25 text-[var(--accent-2)]" : "text-white/40 hover:text-white/75"}`}
            >
              {item === "sticker" ? (
                <>
                  <RiEmojiStickerLine /> Sticker
                </>
              ) : (
                <>
                  <FiLink /> Link
                </>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pilihan media"
          className="grid h-8 w-8 place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-white"
        >
          <FiX />
        </button>
      </div>
      {tab === "sticker" && (
        <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto pr-1">
          {stickers.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => {
                onSelect(url);
                onClose();
              }}
              className="group aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-black/20 transition hover:border-cyan-300/40"
            >
              <img
                src={url}
                alt={`Sticker ${index + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
      {tab === "link" && (
        <div className="space-y-3">
          {manualUrl && (
            <div className="mx-auto aspect-video max-h-24 max-w-48 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <img
                src={manualUrl}
                alt="Preview gambar"
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <input
            type="url"
            value={manualUrl}
            onChange={(event) => {
              setManualUrl(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addManualUrl();
              }
            }}
            placeholder="https://contoh.com/gambar.jpg"
            className="rk-input w-full rounded-xl px-3 py-3 text-xs"
          />
          {error && <p className="text-[10px] text-red-300">{error}</p>}
          <button
            type="button"
            onClick={addManualUrl}
            className="w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 text-xs font-black text-white"
          >
            Gunakan gambar
          </button>
        </div>
      )}
    </div>
  );
}

function Composer({
  parentId,
  compact = false,
  onCreated,
}: {
  parentId?: string;
  compact?: boolean;
  onCreated: () => void;
}) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!content.trim() && !image) || sending) return;
    setSending(true);
    setError("");
    try {
      await socialFetch("/api/social/posts", {
        method: "POST",
        body: JSON.stringify({
          content,
          image_url: image || null,
          visibility,
          parent_id: parentId || null,
        }),
      });
      setContent("");
      setImage("");
      onCreated();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Gagal mengirim postingan.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className={
        compact
          ? "border-t border-white/[0.08] p-3"
          : "rounded-2xl border border-white/[0.1] bg-[linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018))] p-4 shadow-[inset_0_1px_rgba(255,255,255,.025)] sm:p-5"
      }
    >
      {!compact && (
        <div className="mb-4">
          <p className="text-base font-black">Buat postingan</p>
          <p className="mt-0.5 text-xs text-white/40">
            Bagikan kabar atau rekomendasi komik ke komunitas.
          </p>
        </div>
      )}
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, 500))}
        rows={compact ? 3 : 6}
        placeholder={
          parentId
            ? "Tulis balasan..."
            : "Apa yang ingin kamu bagikan hari ini?"
        }
        className={`${compact ? "min-h-28" : "min-h-44 sm:min-h-48"} w-full resize-y rounded-2xl border border-white/[0.12] bg-[#090b14] px-4 py-4 text-[15px] leading-relaxed text-white shadow-inner outline-none transition placeholder:text-white/35 focus:border-cyan-300/45 focus:bg-[#0b0e18]`}
      />
      {image && (
      <div className="relative mx-auto mt-3 max-w-64 overflow-hidden rounded-2xl border border-white/10 bg-black/15">
          <img
            src={image}
            alt="Preview"
            className="max-h-44 w-full object-contain"
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            onClick={() => setImage("")}
            className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs"
          >
            Hapus
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMediaPicker((value) => !value)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[10px] font-bold transition hover:bg-white/5 ${image ? "bg-cyan-300/10 text-cyan-200" : "text-[var(--accent-2)]"}`}
            >
              <RiEmojiStickerLine className="text-base" />
              <span>{image ? "Ganti media" : "Sticker"}</span>
            </button>
            {showMediaPicker && (
              <MediaPicker
                onSelect={setImage}
                onClose={() => setShowMediaPicker(false)}
              />
            )}
          </div>
          {!parentId && (
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="rounded-full border border-white/10 bg-[var(--surface-1)] px-2.5 py-2 text-[10px] font-bold text-white/60"
            >
              <option value="public">Publik</option>
              <option value="followers">Pengikut</option>
            </select>
          )}
          <span className="text-[10px] text-white/30">
            {content.length}/500
          </span>
        </div>
        <button
          disabled={(!content.trim() && !image) || sending}
          className="flex items-center gap-2 rounded-full bg-[var(--accent-2)] px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <FiSend />
          {sending ? "Mengirim" : parentId ? "Balas" : "Posting"}
        </button>
      </div>
    </form>
  );
}

function PostCard({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const author = authorOf(post);
  const [liked, setLiked] = useState(post.viewer_liked);
  const [likes, setLikes] = useState(post.likes_count);
  const [replying, setReplying] = useState(false);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loadedReplies, setLoadedReplies] = useState(false);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      await socialFetch("/api/social/posts/like", {
        method: next ? "POST" : "DELETE",
        body: JSON.stringify({ postId: post.id }),
      });
    } catch {
      setLiked(!next);
      setLikes((value) => Math.max(0, value + (next ? -1 : 1)));
    }
  }
  async function openReplies() {
    setReplying((value) => !value);
    if (loadedReplies) return;
    try {
      const result = await socialFetch<{ items: Post[] }>(
        `/api/social/posts?parentId=${post.id}`,
      );
      setReplies(result.items);
      setLoadedReplies(true);
    } catch {
      setReplies([]);
    }
  }
  async function refreshReplies() {
    const result = await socialFetch<{ items: Post[] }>(
      `/api/social/posts?parentId=${post.id}`,
    );
    setReplies(result.items);
    setLoadedReplies(true);
    setReplying(true);
    onChanged();
  }
  async function remove() {
    if (!confirm("Hapus posting ini?")) return;
    await socialFetch("/api/social/posts", {
      method: "DELETE",
      body: JSON.stringify({ id: post.id }),
    });
    onChanged();
  }
  async function report() {
    const reason = prompt("Alasan laporan:");
    if (!reason) return;
    await socialFetch("/api/social/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "post", targetId: post.id, reason }),
    });
    alert("Laporan dikirim.");
  }

  const profileHref = `/u/${encodeURIComponent(author.username || post.author_id)}`;
  return (
    <article className="border-b border-white/[0.08] bg-[var(--surface-0)] transition last:border-b-0 hover:bg-white/[0.02]">
      <div className="flex gap-3 p-4">
        <Link
          href={profileHref}
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 font-black"
        >
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            (author.username || "U")[0]?.toUpperCase()
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={profileHref}
                className="block truncate text-sm font-black hover:underline"
              >
                {author.username || "User"}
              </Link>
              <span className="text-[11px] text-white/35">
                Lv.{author.level || 1} ·{" "}
                {new Date(post.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <button
              onClick={post.viewer_owns ? remove : report}
              className="rounded-full p-2 text-white/35 hover:bg-white/5 hover:text-white"
            >
              {post.viewer_owns ? <FiTrash2 size={14} /> : <FiMoreHorizontal />}
            </button>
          </div>
          {post.content !== "[sticker]" && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85">
              {post.content}
            </p>
          )}
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Sticker atau gambar posting"
              className={`mt-3 rounded-2xl border border-white/10 object-contain ${post.content === "[sticker]" ? "mx-auto max-h-56 max-w-56" : "max-h-96 w-full"}`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="mt-4 flex max-w-xs justify-between text-white/40">
            <button
              onClick={openReplies}
              className="flex items-center gap-2 text-xs hover:text-[var(--accent-2)]"
            >
              <FiMessageCircle size={17} />
              {post.replies_count || "Balas"}
            </button>
            <button
              onClick={toggleLike}
              className={`flex items-center gap-2 text-xs ${liked ? "text-pink-400" : "hover:text-pink-400"}`}
            >
              <FiHeart size={17} fill={liked ? "currentColor" : "none"} />
              {likes || "Suka"}
            </button>
          </div>
        </div>
      </div>
      {replying && (
        <div className="ml-8 border-l border-white/[0.08]">
          <Composer parentId={post.id} compact onCreated={refreshReplies} />
          {replies.map((reply) => (
            <PostCard key={reply.id} post={reply} onChanged={refreshReplies} />
          ))}
          {loadedReplies && !replies.length && (
            <p className="p-4 text-center text-xs text-white/35">
              Belum ada balasan.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function SocialTimeline() {
  const { user, loading: userLoading } = useSupabaseUser();
  const [scope, setScope] = useState<"following" | "community">("community");
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(
    async (reset = false) => {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const result = await socialFetch<{
          items: Post[];
          nextCursor: string | null;
        }>(
          `/api/social/posts?scope=${scope}${!reset && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        setItems((current) =>
          reset ? result.items : [...current, ...result.items],
        );
        setCursor(result.nextCursor);
      } catch (failure) {
        setError(
          failure instanceof Error ? failure.message : "Timeline gagal dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [cursor, scope, user],
  );

  useEffect(() => {
    void load(true);
  }, [scope, user, version]); // eslint-disable-line react-hooks/exhaustive-deps
  if (userLoading)
    return (
      <div className="rk-card-soft animate-pulse rounded-2xl py-16 text-center text-sm text-white/35">
        Menyiapkan komunitas...
      </div>
    );
  if (!user)
    return (
      <div className="rk-card-soft rounded-2xl p-8 text-center text-white/50">
        <p className="font-black text-white/80">Masuk untuk bergabung</p>
        <p className="mt-2 text-sm">
          Login diperlukan untuk melihat dan membuat postingan komunitas.
        </p>
      </div>
    );

  return (
    <section className="flex min-h-[calc(100dvh-17rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--surface-0)] shadow-[0_20px_70px_rgba(0,0,0,.22)] sm:min-h-[620px]">
      <div className="grid shrink-0 grid-cols-2 border-b border-white/[0.08] bg-white/[0.02]">
        {(["community", "following"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setScope(tab)}
            className={`relative h-14 text-sm font-black transition hover:bg-white/[0.035] ${scope === tab ? "text-white" : "text-white/40"}`}
          >
            {tab === "following" ? "Mengikuti" : "Untuk Kamu"}
            {scope === tab && (
              <span className="absolute inset-x-1/3 bottom-0 h-1 rounded-full bg-[var(--accent-2)]" />
            )}
          </button>
        ))}
      </div>
      <div className="hidden shrink-0 p-5 sm:block">
        <Composer onCreated={() => setVersion((value) => value + 1)} />
      </div>
      {error && (
        <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-200 sm:mx-4">
          <span>{error}</span>
          <button onClick={() => load(true)} className="font-black">
            Coba lagi
          </button>
        </div>
      )}
      <div>
        {items.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onChanged={() => setVersion((value) => value + 1)}
          />
        ))}
      </div>
      {loading && !items.length && (
        <div className="grid min-h-52 flex-1 place-content-center border-t border-white/[0.08] p-10 text-center text-sm text-white/35">
          <FiRefreshCw className="mx-auto mb-2 animate-spin" />
          Memuat postingan...
        </div>
      )}
      {!loading && !error && !items.length && (
        <div className="grid min-h-52 flex-1 place-content-center border-t border-white/[0.08] p-10 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-xl text-white/35">
            <FiMessageCircle />
          </div>
          <p className="text-lg font-black">Timeline masih sepi</p>
          <p className="mt-2 text-sm text-white/40">
            Jadilah yang pertama membagikan rekomendasi hari ini.
          </p>
        </div>
      )}
      {cursor && (
        <button
          disabled={loading}
          onClick={() => load()}
          className="flex w-full items-center justify-center gap-2 border-t border-white/[0.08] py-4 text-sm font-black text-white/60"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          {loading ? "Memuat" : "Muat posting lain"}
        </button>
      )}
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        aria-label="Buat postingan"
        title="Buat postingan"
        className="fixed bottom-[5.5rem] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-2)] text-black shadow-[0_12px_35px_rgba(34,211,238,.28)] transition active:scale-95 sm:hidden"
      >
        <FiEdit3 className="text-xl" />
      </button>
      {composerOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:hidden">
          <button
            type="button"
            aria-label="Tutup composer"
            onClick={() => setComposerOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative z-10 max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border-t border-white/15 bg-[var(--surface-1)] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <h2 className="font-black">Buat postingan</h2>
                <p className="text-[11px] text-white/40">
                  Bagikan sesuatu ke komunitas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60"
              >
                <FiX />
              </button>
            </div>
            <Composer
              onCreated={() => {
                setVersion((value) => value + 1);
                setComposerOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
