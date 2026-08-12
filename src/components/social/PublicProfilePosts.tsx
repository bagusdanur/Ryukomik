"use client";

import { useEffect, useState } from "react";
import { FiHeart, FiMessageCircle } from "react-icons/fi";

type Post = { id: string; content: string; image_url?: string | null; likes_count: number; replies_count: number; created_at: string };

export default function PublicProfilePosts({ username }: { username: string }) {
  const [items, setItems] = useState<Post[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  async function load(reset = false) {
    setLoading(true);
    try { const response = await fetch(`/api/social/profile/${encodeURIComponent(username)}/posts${!reset && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`); if (!response.ok) return; const result = await response.json() as { items: Post[]; nextCursor: string | null }; setItems((current) => reset ? result.items : [...current, ...result.items]); setCursor(result.nextCursor); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(true); }, [username]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section id="social-profile-posts" className="mx-auto max-w-2xl border-x border-white/[0.08] bg-[var(--surface-0)] text-white">
    <div className="border-b border-white/[0.08] px-4 py-3"><h2 className="text-sm font-black">Postingan</h2></div>
    {items.map((post) => <article key={post.id} className="border-b border-white/[0.08] p-4"><div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-full bg-white/5 font-black">{username[0]?.toUpperCase()}</div><div><p className="text-sm font-black">{username}</p><time className="text-[10px] text-white/35">{new Date(post.created_at).toLocaleString("id-ID")}</time></div></div><p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/85">{post.content}</p>{post.image_url && <img src={post.image_url} alt="Lampiran posting" className="mt-3 max-h-[480px] w-full rounded-2xl border border-white/10 object-cover" loading="lazy" referrerPolicy="no-referrer"/>}<div className="mt-3 flex gap-8 text-xs text-white/40"><span className="flex items-center gap-2"><FiMessageCircle/>{post.replies_count}</span><span className="flex items-center gap-2"><FiHeart/>{post.likes_count}</span></div></article>)}
    {!loading && !items.length && <p className="border-b border-white/[0.08] px-4 py-10 text-center text-sm text-white/35">Belum ada postingan publik.</p>}
    {cursor && <button disabled={loading} onClick={() => load()} className="w-full border-b border-white/[0.08] py-4 text-sm font-black text-white/55">{loading ? "Memuat..." : "Muat lagi"}</button>}
  </section>;
}
