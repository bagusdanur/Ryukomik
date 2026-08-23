"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  FiArrowLeft,
  FiBookmark,
  FiCheck,
  FiCopy,
  FiEdit3,
  FiHeart,
  FiMessageCircle,
  FiRefreshCw,
  FiSave,
  FiSend,
  FiX,
} from "react-icons/fi";
import { socialFetch } from "@/lib/social/client";
import ExclusiveCommentWallpaper from "@/components/ExclusiveCommentWallpaper";
import UserBadges from "@/components/UserBadges";

type Author = {
  username?: string;
  avatar_url?: string | null;
  level?: number;
  role?: string | null;
  is_premium?: boolean | null;
};

type Post = {
  id: string;
  author_id: string;
  content: string;
  image_url?: string | null;
  visibility: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  edited_at?: string | null;
  viewer_liked: boolean;
  viewer_bookmarked: boolean;
  viewer_owns: boolean;
  profiles?: Author | Author[] | null;
};

function authorOf(post: Post): Author {
  return Array.isArray(post.profiles) ? post.profiles[0] || {} : post.profiles || {};
}

function visualType(author: Author) {
  if (author.role === "admin") return "admin";
  if (author.role === "staff") return "staff";
  if (author.is_premium) return "premium";
  return "normal";
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Baru saja";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PostDetailClient({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, replyResult] = await Promise.all([
        socialFetch<{ post: Post }>(`/api/social/posts/${id}`, { cache: "no-store" }),
        socialFetch<{ items: Post[] }>(`/api/social/posts?parentId=${id}&live=${Date.now()}`, { cache: "no-store" }),
      ]);
      setPost({ ...detail.post, replies_count: replyResult.items.length });
      setContent(detail.post.content);
      setReplies(replyResult.items);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Postingan gagal dimuat.");
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await socialFetch("/api/social/posts", {
        method: "POST",
        body: JSON.stringify({ content: reply.trim(), parent_id: id, visibility: "public" }),
      });
      setReply("");
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Balasan gagal dikirim.");
    } finally {
      setSendingReply(false);
    }
  }

  async function toggleLike() {
    if (!post) return;
    const next = !post.viewer_liked;
    setPost({ ...post, viewer_liked: next, likes_count: Math.max(0, post.likes_count + (next ? 1 : -1)) });
    try {
      await socialFetch("/api/social/posts/like", { method: next ? "POST" : "DELETE", body: JSON.stringify({ postId: post.id }) });
    } catch {
      await load();
    }
  }

  async function toggleBookmark() {
    if (!post) return;
    const next = !post.viewer_bookmarked;
    setPost({ ...post, viewer_bookmarked: next });
    try {
      await socialFetch("/api/social/posts/bookmark", { method: next ? "POST" : "DELETE", body: JSON.stringify({ postId: post.id }) });
    } catch {
      setPost({ ...post, viewer_bookmarked: !next });
    }
  }

  async function save() {
    if (!post || !content.trim()) return;
    await socialFetch(`/api/social/posts/${post.id}`, { method: "PATCH", body: JSON.stringify({ content, visibility: post.visibility }) });
    setEditing(false);
    await load();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (error && !post) return <div className="mx-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center text-red-200 sm:mx-0">{error}</div>;
  if (!post) return <div className="mx-3 rounded-2xl border border-white/10 py-20 text-center text-white/40 sm:mx-0"><FiRefreshCw className="mx-auto mb-3 animate-spin" />Memuat postingan...</div>;

  const author = authorOf(post);
  const profileHref = `/u/${encodeURIComponent(author.username || post.author_id)}`;

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-30 flex h-14 items-center gap-3 border-y border-white/[0.08] bg-[color:color-mix(in_srgb,var(--surface-0)_90%,transparent)] px-3 backdrop-blur-xl sm:top-16 sm:rounded-2xl sm:border-x">
        <Link href="/files" aria-label="Kembali ke komunitas" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/[0.07] hover:text-white"><FiArrowLeft /></Link>
        <div><h1 className="font-black">Postingan</h1><p className="text-[10px] text-white/35">RyuSpace Community</p></div>
      </div>

      <article className="relative mx-3 overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--surface-0)] sm:mx-0 sm:rounded-3xl">
        <ExclusiveCommentWallpaper type={visualType(author)} />
        <div className="relative z-[1] p-4 sm:p-6">
          <div className="flex gap-3">
            <Link href={profileHref} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 font-black sm:h-12 sm:w-12">
              {author.avatar_url ? <img src={author.avatar_url} alt={author.username || ""} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (author.username || "U")[0]?.toUpperCase()}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5"><Link href={profileHref} className="truncate font-black hover:text-cyan-200">{author.username || "User"}</Link><UserBadges role={author.role} isPremium={author.is_premium} /></div>
              <p className="text-[11px] text-white/40">Level {author.level || 1} · {relativeTime(post.created_at)}{post.edited_at ? " · diedit" : ""}</p>
            </div>
          </div>

          <div className="mt-5">
            {editing ? <textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, 500))} className="rk-input min-h-36 w-full rounded-xl p-4" /> : post.content !== "[sticker]" && <p className="whitespace-pre-wrap break-words text-[16px] leading-relaxed text-white/90 sm:text-[17px]">{post.content}</p>}
            {post.image_url && <img src={post.image_url} alt="Media postingan" className={`mt-4 border border-white/10 object-contain ${post.content === "[sticker]" ? "mx-auto max-h-24 max-w-24 rounded-xl" : "max-h-[34rem] w-full rounded-2xl"}`} referrerPolicy="no-referrer" />}
          </div>

          <div className="mt-6 flex items-center justify-around border-y border-white/[0.08] py-2 text-white/45">
            <button onClick={() => document.getElementById("reply-composer")?.focus()} className="flex items-center gap-2 rounded-full px-3 py-2 text-xs hover:bg-white/5 hover:text-cyan-200"><FiMessageCircle /> {post.replies_count}</button>
            <button onClick={toggleLike} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs hover:bg-white/5 ${post.viewer_liked ? "text-pink-400" : "hover:text-pink-400"}`}><FiHeart fill={post.viewer_liked ? "currentColor" : "none"} /> {post.likes_count}</button>
            <button onClick={toggleBookmark} className={`grid h-9 w-9 place-items-center rounded-full hover:bg-white/5 ${post.viewer_bookmarked ? "text-cyan-300" : ""}`} aria-label="Simpan postingan"><FiBookmark fill={post.viewer_bookmarked ? "currentColor" : "none"} /></button>
            <button onClick={copyLink} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5 hover:text-cyan-200" aria-label="Salin tautan">{copied ? <FiCheck /> : <FiCopy />}</button>
            {post.viewer_owns && (editing ? <><button onClick={() => setEditing(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5"><FiX /></button><button onClick={save} className="grid h-9 w-9 place-items-center rounded-full text-cyan-200 hover:bg-white/5"><FiSave /></button></> : <button onClick={() => setEditing(true)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" aria-label="Edit postingan"><FiEdit3 /></button>)}
          </div>

          <form onSubmit={submitReply} className="mt-4 flex items-end gap-2">
            <textarea id="reply-composer" value={reply} onChange={(event) => setReply(event.target.value.slice(0, 500))} disabled={sendingReply} rows={2} placeholder="Tulis balasan..." className="rk-input min-h-12 flex-1 resize-none rounded-2xl px-4 py-3 text-sm" />
            <button disabled={!reply.trim() || sendingReply} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-35" aria-label="Kirim balasan">{sendingReply ? <FiRefreshCw className="animate-spin" /> : <FiSend />}</button>
          </form>
          {error && <p className="mt-3 text-xs text-red-200">{error}</p>}
        </div>
      </article>

      <section className="mx-3 overflow-hidden rounded-2xl border border-white/[0.09] bg-[var(--surface-0)] sm:mx-0 sm:rounded-3xl">
        <h2 className="border-b border-white/[0.08] px-4 py-4 font-black sm:px-6">Balasan <span className="ml-1 text-sm text-white/35">{replies.length}</span></h2>
        {replies.map((item) => {
          const replyAuthor = authorOf(item);
          return <article key={item.id} className="relative overflow-hidden border-b border-white/[0.06] p-4 last:border-0 sm:px-6"><ExclusiveCommentWallpaper type={visualType(replyAuthor)} /><div className="relative z-[1] flex gap-3"><Link href={`/u/${encodeURIComponent(replyAuthor.username || item.author_id)}`} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 text-xs font-black">{replyAuthor.avatar_url ? <img src={replyAuthor.avatar_url} alt="" className="h-full w-full object-cover" /> : (replyAuthor.username || "U")[0]}</Link><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><Link href={`/u/${encodeURIComponent(replyAuthor.username || item.author_id)}`} className="text-sm font-black hover:text-cyan-200">{replyAuthor.username || "User"}</Link><UserBadges role={replyAuthor.role} isPremium={replyAuthor.is_premium} /></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">{item.content}</p><time className="mt-2 block text-[10px] text-white/35">{relativeTime(item.created_at)}</time></div></div></article>;
        })}
        {!replies.length && <p className="px-4 py-12 text-center text-sm text-white/35">Belum ada balasan. Jadilah yang pertama membalas.</p>}
      </section>
    </div>
  );
}
