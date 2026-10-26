import { unstable_cache } from "next/cache";
import { socialQuery } from "@/lib/social/db";
import { getSocialProfiles } from "@/lib/social/profileLookup";

const COMMENTS_TTL = 300;
const COMMENT_SNIPPET_LIMIT = 220;

type CommentProfile =
  | {
      username?: string | null;
      avatar_url?: string | null;
    }
  | {
      username?: string | null;
      avatar_url?: string | null;
    }[]
  | null;

type CommentRow = {
  id: string;
  user_id?: string | null;
  slug?: string | null;
  author_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  content?: string | null;
  profiles?: CommentProfile;
};

const firstProfile = (profiles: CommentProfile) =>
  Array.isArray(profiles) ? profiles[0] : profiles;

function compactContent(content?: string | null) {
  if (!content) return "";
  if (content.length <= COMMENT_SNIPPET_LIMIT) return content;
  return `${content.slice(0, COMMENT_SNIPPET_LIMIT).trim()}...`;
}

function getLink(slug?: string | null) {
  if (!slug) return "#";
  if (slug.includes("chapter")) return `/chapter/${slug}`;
  return `/komik/${slug}`;
}

function formatTitle(slug?: string | null) {
  return slug?.replace(/-chapter-.*/, "").replace(/-/g, " ");
}

function getChapter(slug?: string | null) {
  const match = slug?.match(/chapter-(\d+)/);
  return match ? `Chapter ${match[1]}` : null;
}

const getLatestPublicComments = unstable_cache(
  async () => {
    // Komentar dibaca dari Postgres lokal (migrasi komentar).
    const { rows: localRows } = await socialQuery<CommentRow>(
      `select id, slug, author_name, avatar_url, created_at, content, user_id
         from comments
        where parent_id is null and deleted_at is null
        order by created_at desc
        limit 20`,
    );
    const rows = localRows;
    // Nama/avatar penulis dari database lokal (satu query batch), bukan join
    // ke profiles Supabase.
    const people = await getSocialProfiles(rows.map((comment) => comment.user_id));

    return rows.map((comment) => {
      const person = comment.user_id ? people.get(String(comment.user_id)) : undefined;
      return {
        ...comment,
        profiles: person
          ? { username: person.username, avatar_url: person.avatar_url }
          : { username: comment.author_name, avatar_url: comment.avatar_url },
        content: compactContent(comment.content),
      };
    });
  },
  ["public-komentar-v2"],
  { revalidate: COMMENTS_TTL, tags: ["comments"] },
);

export const revalidate = 300;

export default async function KomentarPage() {
  const comments = await getLatestPublicComments();

  return (
    <div className="min-h-screen bg-[#0f0f13] px-4 py-18 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-2xl font-bold">Komentar Terbaru</h1>

        <div className="space-y-4">
          {comments.map((comment) => {
            const title = formatTitle(comment.slug);
            const chapter = getChapter(comment.slug);
            const profile = firstProfile(comment.profiles);
            const authorName = profile?.username || comment.author_name || "Anon";
            const avatarUrl = profile?.avatar_url || comment.avatar_url;

            return (
              <a
                key={comment.id}
                href={getLink(comment.slug)}
                className="block rounded-xl bg-white/5 p-4 shadow transition hover:bg-white/10"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-600/20 font-bold">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        className="h-full w-full object-cover"
                        alt={authorName}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      authorName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{authorName}</span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {new Date(comment.created_at).toLocaleString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-gray-300">
                      {comment.content}
                    </p>

                    <div className="mt-2 text-xs text-gray-500">
                      {title}
                      {chapter ? ` - ${chapter}` : ""}
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
