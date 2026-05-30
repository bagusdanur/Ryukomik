"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CommentRow = {
  id: string;
  slug?: string | null;
  author_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  content?: string | null;
  profiles?:
    | {
    username?: string | null;
    avatar_url?: string | null;
      }
    | {
        username?: string | null;
        avatar_url?: string | null;
      }[]
    | null;
};

const firstProfile = (profiles: CommentRow["profiles"]) =>
  Array.isArray(profiles) ? profiles[0] : profiles;

export default function KomentarPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getComments() {
      const { data } = await supabase
        .from("comments")
        .select("id, slug, author_name, avatar_url, created_at, content, profiles(username, avatar_url)")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(20);

      setComments(data || []);
      setLoading(false);
    }

    getComments();
  }, []);

  const getLink = (slug?: string | null) => {
    if (!slug) return "#";
    if (slug.includes("chapter")) return `/chapter/${slug}`;
    return `/komik/${slug}`;
  };

  const formatTitle = (slug?: string | null) => {
    return slug
      ?.replace(/-chapter-.*/, "")
      .replace(/-/g, " ");
  };

  const getChapter = (slug?: string | null) => {
    const match = slug?.match(/chapter-(\d+)/);
    return match ? `Chapter ${match[1]}` : null;
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white px-4 py-18">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Komentar Terbaru</h1>

        {loading && <p className="text-gray-400">Loading...</p>}

        <div className="space-y-4">
          {comments.map((c) => {
            const title = formatTitle(c.slug);
            const chapter = getChapter(c.slug);
            const profile = firstProfile(c.profiles);
            const authorName = profile?.username || c.author_name || "Anon";
            const avatarUrl = profile?.avatar_url || c.avatar_url;

            return (
              <a
                key={c.id}
                href={getLink(c.slug)}
                className="block bg-white/5 p-4 rounded-xl shadow hover:bg-white/10 transition"
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600/20 flex items-center justify-center font-bold">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        className="w-full h-full object-cover"
                        alt={authorName}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      authorName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1">
                    {/* Name + Time */}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">
                        {authorName}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(c.created_at).toLocaleString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                      {c.content}
                    </p>

                    {/* Info */}
                    <div className="text-xs text-gray-500 mt-2">
                      {title}
                      {chapter ? ` • ${chapter}` : ""}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
