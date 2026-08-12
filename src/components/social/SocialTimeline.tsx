"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { FiHeart, FiImage, FiMessageCircle, FiMoreHorizontal, FiRefreshCw, FiSend, FiTrash2 } from "react-icons/fi";
import { socialFetch } from "@/lib/social/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type Author = { username?: string; avatar_url?: string | null; level?: number; role?: string; is_premium?: boolean };
type Post = { id: string; author_id: string; content: string; image_url?: string | null; visibility: string; likes_count: number; replies_count: number; created_at: string; viewer_liked: boolean; viewer_owns: boolean; profiles?: Author | Author[] | null };

function authorOf(post: Post): Author { return Array.isArray(post.profiles) ? post.profiles[0] || {} : post.profiles || {}; }

function Composer({ parentId, compact = false, onCreated }: { parentId?: string; compact?: boolean; onCreated: () => void }) {
  const [content, setContent] = useState(""); const [image, setImage] = useState(""); const [visibility, setVisibility] = useState("public"); const [sending, setSending] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!content.trim() || sending) return; setSending(true); setError("");
    try { await socialFetch("/api/social/posts", { method: "POST", body: JSON.stringify({ content, image_url: image || null, visibility, parent_id: parentId || null }) }); setContent(""); setImage(""); onCreated(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Gagal mengirim."); }
    finally { setSending(false); }
  }
  return <form onSubmit={submit} className={`${compact ? "border-t border-white/[0.08] p-3" : "rk-card-soft rounded-2xl p-4"}`}>
    <textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, 500))} rows={compact ? 2 : 3} placeholder={parentId ? "Tulis balasan..." : "Apa yang sedang kamu pikirkan?"} className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white outline-none placeholder:text-white/30" />
    {image && <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10"><img src={image} alt="Preview" className="max-h-72 w-full object-cover" referrerPolicy="no-referrer"/><button type="button" onClick={() => setImage("")} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs">Hapus</button></div>}
    {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3">
      <div className="flex items-center gap-2"><label className="cursor-pointer rounded-full p-2 text-[var(--accent-2)] hover:bg-white/5" title="Tambahkan URL gambar"><FiImage/><input value={image} onChange={(event) => setImage(event.target.value)} className="sr-only" type="url" aria-label="URL gambar HTTPS" /></label>{!parentId && <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="rounded-full border border-white/10 bg-transparent px-2 py-1 text-[10px] font-bold text-white/55"><option value="public">Publik</option><option value="followers">Pengikut</option></select>}<span className="text-[10px] text-white/30">{content.length}/500</span></div>
      <button disabled={!content.trim() || sending} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-40"><FiSend/>{sending ? "Mengirim" : parentId ? "Balas" : "Posting"}</button>
    </div>
  </form>;
}

function PostCard({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const author = authorOf(post); const [liked, setLiked] = useState(post.viewer_liked); const [likes, setLikes] = useState(post.likes_count); const [replying, setReplying] = useState(false); const [replies, setReplies] = useState<Post[]>([]); const [loadedReplies, setLoadedReplies] = useState(false);
  async function toggleLike() { const next = !liked; setLiked(next); setLikes((value) => Math.max(0, value + (next ? 1 : -1))); try { await socialFetch("/api/social/posts/like", { method: next ? "POST" : "DELETE", body: JSON.stringify({ postId: post.id }) }); } catch { setLiked(!next); setLikes((value) => Math.max(0, value + (next ? -1 : 1))); } }
  async function openReplies() { setReplying((value) => !value); if (loadedReplies) return; try { const result = await socialFetch<{ items: Post[] }>(`/api/social/posts?parentId=${post.id}`); setReplies(result.items); setLoadedReplies(true); } catch { setReplies([]); } }
  async function refreshReplies() { const result = await socialFetch<{ items: Post[] }>(`/api/social/posts?parentId=${post.id}`); setReplies(result.items); setLoadedReplies(true); setReplying(true); onChanged(); }
  async function remove() { if (!confirm("Hapus posting ini?")) return; await socialFetch("/api/social/posts", { method: "DELETE", body: JSON.stringify({ id: post.id }) }); onChanged(); }
  async function report() { const reason = prompt("Alasan laporan (spam, pelecehan, konten terlarang, dll):"); if (!reason) return; await socialFetch("/api/social/reports", { method: "POST", body: JSON.stringify({ targetType: "post", targetId: post.id, reason }) }); alert("Laporan dikirim."); }
  return <article className="border-b border-white/[0.08] bg-[var(--surface-0)] transition hover:bg-white/[0.015]">
    <div className="flex gap-3 p-4"><Link href={`/u/${encodeURIComponent(author.username || post.author_id)}`} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 font-black">{author.avatar_url ? <img src={author.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer"/> : (author.username || "U")[0]?.toUpperCase()}</Link><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><Link href={`/u/${encodeURIComponent(author.username || post.author_id)}`} className="truncate text-sm font-black hover:underline">{author.username || "User"}</Link><span className="ml-1.5 text-xs text-white/35">Lv.{author.level || 1} · {new Date(post.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span></div><button onClick={post.viewer_owns ? remove : report} className="rounded-full p-2 text-white/35 hover:bg-white/5 hover:text-white" title={post.viewer_owns ? "Hapus post" : "Laporkan post"}>{post.viewer_owns ? <FiTrash2 size={14}/> : <FiMoreHorizontal/>}</button></div>
      <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85">{post.content}</p>{post.image_url && <img src={post.image_url} alt="Lampiran posting" className="mt-3 max-h-[480px] w-full rounded-2xl border border-white/10 object-cover" loading="lazy" referrerPolicy="no-referrer"/>}
      <div className="mt-3 flex max-w-xs justify-between text-white/40"><button onClick={openReplies} className="flex items-center gap-2 text-xs hover:text-[var(--accent-2)]"><FiMessageCircle size={17}/>{post.replies_count || ""}</button><button onClick={toggleLike} className={`flex items-center gap-2 text-xs ${liked ? "text-pink-400" : "hover:text-pink-400"}`}><FiHeart size={17} fill={liked ? "currentColor" : "none"}/>{likes || ""}</button></div>
    </div></div>
    {replying && <div className="ml-8 border-l border-white/[0.08]"><Composer parentId={post.id} compact onCreated={refreshReplies}/>{replies.map((reply) => <PostCard key={reply.id} post={reply} onChanged={refreshReplies}/>)}{loadedReplies && !replies.length && <p className="p-4 text-center text-xs text-white/35">Belum ada balasan.</p>}</div>}
  </article>;
}

export default function SocialTimeline() {
  const { user } = useSupabaseUser(); const [scope, setScope] = useState<"following" | "community">("following"); const [items, setItems] = useState<Post[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [version, setVersion] = useState(0);
  const load = useCallback(async (reset = false) => { if (!user) return; setLoading(true); try { const result = await socialFetch<{ items: Post[]; nextCursor: string | null }>(`/api/social/posts?scope=${scope}${!reset && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`); setItems((current) => reset ? result.items : [...current, ...result.items]); setCursor(result.nextCursor); } finally { setLoading(false); } }, [cursor, scope, user]);
  useEffect(() => { void load(true); }, [scope, user, version]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return <div className="rk-card-soft rounded-2xl p-8 text-center text-white/50">Login untuk membuka timeline komunitas.</div>;
  return <section className="mx-auto max-w-2xl overflow-hidden border-x border-white/[0.08] bg-[var(--surface-0)] sm:rounded-2xl sm:border-t">
    <div className="sticky top-14 z-20 grid grid-cols-2 border-b border-white/[0.08] bg-[color:color-mix(in_srgb,var(--surface-0)_88%,transparent)] backdrop-blur-xl">{(["following", "community"] as const).map((tab) => <button key={tab} onClick={() => setScope(tab)} className={`relative h-12 text-sm font-black ${scope === tab ? "text-white" : "text-white/40"}`}>{tab === "following" ? "Mengikuti" : "Komunitas"}{scope === tab && <span className="absolute inset-x-1/3 bottom-0 h-1 rounded-full bg-[var(--accent-2)]"/>}</button>)}</div>
    <div className="p-3"><Composer onCreated={() => setVersion((value) => value + 1)}/></div>
    <div>{items.map((post) => <PostCard key={post.id} post={post} onChanged={() => setVersion((value) => value + 1)}/>)}</div>
    {!loading && !items.length && <div className="p-12 text-center"><p className="font-black">Timeline masih sepi</p><p className="mt-2 text-sm text-white/40">Mulai posting atau ikuti anggota komunitas.</p></div>}
    {cursor && <button disabled={loading} onClick={() => load()} className="flex w-full items-center justify-center gap-2 border-t border-white/[0.08] py-4 text-sm font-black text-white/60"><FiRefreshCw className={loading ? "animate-spin" : ""}/>{loading ? "Memuat" : "Muat posting lain"}</button>}
  </section>;
}
