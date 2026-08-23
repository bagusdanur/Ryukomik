"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiHeart, FiMessageCircle } from "react-icons/fi";
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
  content: string;
  image_url?: string | null;
  likes_count: number;
  replies_count: number;
  created_at: string;
  profiles?: Author | Author[] | null;
};

function postAuthor(post: Post): Author {
  return Array.isArray(post.profiles) ? post.profiles[0] || {} : post.profiles || {};
}

function visualType(author: Author) {
  if (author.role === "admin") return "admin";
  if (author.role === "staff") return "staff";
  if (author.is_premium) return "premium";
  return "normal";
}

export default function PublicProfilePosts({ username }: { username: string }) {
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(reset = false) {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/social/profile/${encodeURIComponent(username)}/posts${!reset && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const result = (await response.json()) as { items: Post[]; nextCursor: string | null };
      setItems((current) => (reset ? result.items : [...current, ...result.items]));
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section id="social-profile-posts" className="mx-auto max-w-2xl border-x border-white/[0.08] bg-[var(--surface-0)] text-white">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <h2 className="text-sm font-black">Postingan</h2>
      </div>
      {items.map((post) => {
        const author = postAuthor(post);
        const displayName = author.username || username;
        return (
          <article key={post.id} className="relative overflow-hidden border-b border-white/[0.08]">
            <ExclusiveCommentWallpaper type={visualType(author)} />
            <div className="relative z-[1] p-4">
              <div className="flex items-center gap-3">
                <Link href={`/u/${encodeURIComponent(displayName)}`} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 font-black">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    displayName[0]?.toUpperCase()
                  )}
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/u/${encodeURIComponent(displayName)}`} className="truncate text-sm font-black hover:underline">{displayName}</Link>
                    <UserBadges role={author.role} isPremium={author.is_premium} />
                  </div>
                  <time className="text-[10px] text-white/40">
                    Level {author.level || 1} · {new Date(post.created_at).toLocaleString("id-ID")}
                  </time>
                </div>
              </div>
              {post.content !== "[sticker]" && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{post.content}</p>}
              {post.image_url && <img src={post.image_url} alt="Lampiran posting" className={`mt-3 border border-white/10 object-contain ${post.content === "[sticker]" ? "mx-auto max-h-24 max-w-24 rounded-xl" : "max-h-[480px] w-full rounded-2xl"}`} loading="lazy" referrerPolicy="no-referrer" />}
              <div className="mt-3 flex gap-8 text-xs text-white/50">
                <Link href={`/post/${post.id}`} className="flex items-center gap-2 hover:text-cyan-200"><FiMessageCircle />{post.replies_count}</Link>
                <span className="flex items-center gap-2"><FiHeart />{post.likes_count}</span>
              </div>
            </div>
          </article>
        );
      })}
      {!loading && !items.length && <p className="border-b border-white/[0.08] px-4 py-10 text-center text-sm text-white/35">Belum ada postingan publik.</p>}
      {cursor && <button disabled={loading} onClick={() => load()} className="w-full border-b border-white/[0.08] py-4 text-sm font-black text-white/55">{loading ? "Memuat..." : "Muat lagi"}</button>}
    </section>
  );
}
