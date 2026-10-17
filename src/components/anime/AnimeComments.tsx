"use client";

/**
 * Komentar anime per episode.
 *
 * Menumpang tabel `social_posts` (PostgreSQL VPS) dengan context_type='anime'
 * + context_id=<slug episode>, jadi mewarisi like, balasan, notifikasi, blokir,
 * dan mute tanpa tabel baru. Supabase hanya dipakai untuk auth (verifikasi JWT
 * lokal via JWKS) — data komentar tidak pernah menyentuh Supabase, jadi egress
 * tidak naik.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { FiHeart, FiMessageCircle, FiSend, FiTrash2, FiChevronDown } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch, socialRead } from "@/lib/social/client";
import { relativeTime } from "@/lib/social/relativeTime";
import UserBadges from "@/components/UserBadges";

type Author = {
  username?: string;
  avatar_url?: string | null;
  level?: number;
  role?: string | null;
  is_premium?: boolean | null;
  total_reads?: number | null;
};

type Comment = {
  id: string;
  author_id: string;
  content: string;
  image_url?: string | null;
  likes_count: number;
  replies_count: number;
  created_at: string;
  viewer_liked: boolean;
  viewer_owns: boolean;
  profiles?: Author | Author[] | null;
};

function authorOf(comment: Comment): Author {
  return Array.isArray(comment.profiles) ? comment.profiles[0] || {} : comment.profiles || {};
}

export default function AnimeComments({ slug, title }: { slug: string; title?: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [highlight, setHighlight] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Deep-link dari notifikasi: /anime/episode/<slug>?reply=<id> menyorot balasan.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("reply");
    if (id) setHighlight(id);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSignedIn(Boolean(data.session));
      setViewerId(data.session?.user.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(
    async (next?: string) => {
      if (next) setLoadingMore(true);
      else setLoading(true);
      try {
        const query = new URLSearchParams({
          scope: "public",
          contextType: "anime",
          contextId: slug,
        });
        if (next) query.set("cursor", next);
        const result = await socialRead<{ items: Comment[]; nextCursor: string | null }>(
          `/api/social/posts?${query.toString()}`,
        );
        setComments((current) => (next ? [...current, ...result.items] : result.items));
        setCursor(result.nextCursor);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Gagal memuat komentar.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await socialFetch<{ post: Comment }>("/api/social/posts", {
        method: "POST",
        body: JSON.stringify({
          content,
          parent_id: replyTo?.id,
          contextType: "anime",
          contextId: slug,
        }),
      });
      if (replyTo) {
        setReplies((current) => ({
          ...current,
          [replyTo.id]: [...(current[replyTo.id] || []), { ...result.post, viewer_liked: false, viewer_owns: true }],
        }));
        setOpenReplies((current) => ({ ...current, [replyTo.id]: true }));
        setComments((current) =>
          current.map((item) =>
            item.id === replyTo.id ? { ...item, replies_count: item.replies_count + 1 } : item,
          ),
        );
      } else {
        setComments((current) => [{ ...result.post, viewer_liked: false, viewer_owns: true }, ...current]);
      }
      setDraft("");
      setReplyTo(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Gagal mengirim komentar.");
    } finally {
      setSending(false);
    }
  }

  async function toggleLike(comment: Comment, isReply = false) {
    const next = !comment.viewer_liked;
    const apply = (list: Comment[]) =>
      list.map((item) =>
        item.id === comment.id
          ? { ...item, viewer_liked: next, likes_count: Math.max(0, item.likes_count + (next ? 1 : -1)) }
          : item,
      );
    // Balasan hidup di dalam map `replies[parentId]`; cari parent-nya dulu.
    const patchReplies = (fn: (list: Comment[]) => Comment[]) =>
      setReplies((current) => {
        const parent = Object.keys(current).find((key) => current[key].some((item) => item.id === comment.id));
        return parent ? { ...current, [parent]: fn(current[parent]) } : current;
      });

    if (isReply) patchReplies(apply);
    else setComments(apply);

    try {
      await socialFetch("/api/social/posts/like", {
        method: next ? "POST" : "DELETE",
        body: JSON.stringify({ postId: comment.id }),
      });
    } catch {
      const revert = (list: Comment[]) =>
        list.map((item) =>
          item.id === comment.id
            ? { ...item, viewer_liked: !next, likes_count: Math.max(0, item.likes_count + (next ? -1 : 1)) }
            : item,
        );
      if (isReply) patchReplies(revert);
      else setComments(revert);
    }
  }

  async function loadReplies(commentId: string) {
    if (openReplies[commentId]) {
      setOpenReplies((current) => ({ ...current, [commentId]: false }));
      return;
    }
    setOpenReplies((current) => ({ ...current, [commentId]: true }));
    if (replies[commentId]) return;
    try {
      const result = await socialRead<{ items: Comment[] }>(
        `/api/social/posts?scope=public&contextType=anime&contextId=${encodeURIComponent(slug)}&parentId=${commentId}`,
      );
      setReplies((current) => ({ ...current, [commentId]: result.items }));
    } catch {
      /* biarkan kosong; user bisa coba lagi */
    }
  }

  // Deep-link: begitu komentar dimuat, cari balasan tersorot di antara induk
  // yang punya balasan, buka lipatannya, lalu scroll ke sana.
  useEffect(() => {
    if (!highlight || !comments.length) return;
    let cancelled = false;
    (async () => {
      for (const parent of comments) {
        if (cancelled || parent.replies_count <= 0) continue;
        let list = replies[parent.id];
        if (!list) {
          try {
            const result = await socialRead<{ items: Comment[] }>(
              `/api/social/posts?scope=public&contextType=anime&contextId=${encodeURIComponent(slug)}&parentId=${parent.id}`,
            );
            list = result.items;
            if (cancelled) return;
            setReplies((current) => ({ ...current, [parent.id]: result.items }));
          } catch {
            continue;
          }
        }
        if (list.some((item) => item.id === highlight)) {
          setOpenReplies((current) => ({ ...current, [parent.id]: true }));
          requestAnimationFrame(() => {
            document.getElementById(`comment-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // sengaja hanya bergantung pada highlight + daftar komentar awal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, comments.length, slug]);

  async function remove(comment: Comment, isReply = false) {
    if (!confirm("Hapus komentar ini?")) return;
    try {
      await socialFetch("/api/social/posts", { method: "DELETE", body: JSON.stringify({ id: comment.id }) });
      if (isReply) {
        setReplies((current) => {
          const parent = Object.keys(current).find((key) => current[key].some((item) => item.id === comment.id));
          return parent ? { ...current, [parent]: current[parent].filter((item) => item.id !== comment.id) } : current;
        });
      } else {
        setComments((current) => current.filter((item) => item.id !== comment.id));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Gagal menghapus komentar.");
    }
  }

  function startReply(comment: Comment) {
    setReplyTo({ id: comment.id, name: authorOf(comment).username || "User" });
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function CommentRow({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
    const author = authorOf(comment);
    const href = `/u/${encodeURIComponent(author.username || comment.author_id)}`;
    return (
      <article
        id={`comment-${comment.id}`}
        className={`flex gap-3 py-3.5 ${
          highlight === comment.id ? "-mx-2 rounded-xl bg-cyan-300/[0.07] px-2 ring-1 ring-cyan-300/25" : ""
        }`}
      >
        <Link
          href={href}
          className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs font-black"
        >
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            (author.username || "U")[0]?.toUpperCase()
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Link href={href} className="max-w-[10rem] truncate text-sm font-black hover:text-cyan-200 sm:max-w-[14rem]">
              {author.username || "User"}
            </Link>
            <UserBadges role={author.role} isPremium={author.is_premium} totalReads={author.total_reads} />
            <span className="text-[10px] text-white/30">· {relativeTime(comment.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">{comment.content}</p>
          {comment.image_url && (
            <img
              src={comment.image_url}
              alt=""
              loading="lazy"
              className="mt-2 max-h-64 rounded-xl border border-white/10 object-cover"
            />
          )}
          <div className="mt-1.5 flex items-center gap-1 text-white/45">
            <button
              onClick={() => void toggleLike(comment, isReply)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition hover:bg-white/5 ${
                comment.viewer_liked ? "text-pink-400" : "hover:text-pink-400"
              }`}
              aria-label="Suka komentar"
            >
              <FiHeart size={13} fill={comment.viewer_liked ? "currentColor" : "none"} />
              {comment.likes_count || "Suka"}
            </button>
            {!isReply && (
              <button
                onClick={() => startReply(comment)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition hover:bg-white/5 hover:text-cyan-200"
                aria-label="Balas komentar"
              >
                <FiMessageCircle size={13} />
                Balas
              </button>
            )}
            {!isReply && comment.replies_count > 0 && (
              <button
                onClick={() => void loadReplies(comment.id)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-cyan-200/80 transition hover:bg-white/5"
              >
                <FiChevronDown size={13} className={openReplies[comment.id] ? "rotate-180" : ""} />
                {openReplies[comment.id] ? "Sembunyikan" : `${comment.replies_count} balasan`}
              </button>
            )}
            {comment.viewer_owns && (
              <button
                onClick={() => void remove(comment, isReply)}
                className="ml-auto shrink-0 rounded-full p-1.5 text-white/25 transition hover:bg-white/5 hover:text-red-300"
                aria-label="Hapus komentar"
              >
                <FiTrash2 size={13} />
              </button>
            )}
          </div>
          {!isReply && openReplies[comment.id] && (
            <div className="relative z-[1] ml-3 mt-2 border-l border-white/10 pl-3">
              {(replies[comment.id] || []).map((reply) => (
                <CommentRow key={reply.id} comment={reply} isReply />
              ))}
              {!replies[comment.id]?.length && (
                <p className="py-2 text-xs text-white/30">Belum ada balasan.</p>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <section className="relative z-[1] mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e19]/95 backdrop-blur-sm">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3.5">
        <FiMessageCircle className="text-cyan-200" size={15} />
        <h2 className="text-sm font-black">Komentar{title ? ` · ${title}` : ""}</h2>
        <span className="ml-auto text-[11px] font-bold text-white/35">{comments.length}</span>
      </header>

      {signedIn === false ? (
        <p className="px-4 py-6 text-center text-xs text-white/45">
          <Link href="/login" className="font-black text-cyan-200 hover:underline">
            Masuk
          </Link>{" "}
          dulu untuk ikut berkomentar.
        </p>
      ) : (
        <form onSubmit={submit} className="border-b border-white/10 px-4 py-3.5">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2 text-xs text-cyan-100/85">
              <span className="min-w-0 truncate">
                Membalas <strong>@{replyTo.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold hover:bg-white/10"
              >
                Batal
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 500))}
              disabled={sending}
              rows={2}
              placeholder={replyTo ? `Balas @${replyTo.name}...` : "Tulis komentar tentang episode ini..."}
              className="min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
            />
            <button
              disabled={!draft.trim() || sending}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan-300 text-black transition disabled:opacity-35"
              aria-label="Kirim komentar"
            >
              <FiSend />
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
        </form>
      )}

      <div className="divide-y divide-white/[0.06] px-4">
        {loading && <p className="py-8 text-center text-xs text-white/35">Memuat komentar...</p>}
        {!loading && !comments.length && (
          <p className="py-8 text-center text-xs text-white/35">Belum ada komentar. Jadi yang pertama!</p>
        )}
        {comments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} />
        ))}
      </div>

      {cursor && (
        <button
          disabled={loadingMore}
          onClick={() => void load(cursor)}
          className="w-full border-t border-white/10 py-3 text-xs font-black text-white/60 transition hover:bg-white/[0.04] disabled:opacity-50"
        >
          {loadingMore ? "Memuat..." : "Muat komentar lain"}
        </button>
      )}
    </section>
  );
}
