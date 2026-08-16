import Link from "next/link";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getXpLeadersCached, type XpLeaderRow } from "@/lib/profileServerCache";
import ExclusiveCommentWallpaper from "@/components/ExclusiveCommentWallpaper";
import UserBadges from "@/components/UserBadges";
import ProfilePopover from "@/components/profile/ProfilePopover";
import {
  FiClock,
  FiMessageSquare,
  FiAlertTriangle,
  FiBookOpen,
  FiAward,
  FiChevronRight,
} from "react-icons/fi";

// ============================================
// CONSTANTS
// ============================================
import { VALID_SOURCE_IDS, DEFAULT_SOURCE } from "@/config/sources";

const SUPPORTED_SOURCES = Object.freeze(Array.from(VALID_SOURCE_IDS));
const ADULT_SOURCE_PREFIXES = Object.freeze(["doujindesu-", "sektedoujin-"]);
const SLUG_PREFIXES = Object.freeze(
  [...SUPPORTED_SOURCES, "sektedoujin"].map(s => `${s}-`)
);
const IMAGE_REGEX = /\.(jpg|jpeg|png|webp|gif)$/i;
const URL_REGEX = /^\[https?:\/\/[^\]]+\]$/;
const CHAPTER_REGEX_1 = /\/chapter-(.+)/;
const CHAPTER_REGEX_2 = /-chapter-(\d+)/;
const DEFAULT_PROFILE = Object.freeze({
  level: 1,
  role: "user",
  is_premium: false,
  xp: 0,
  username: "",
  avatar_url: "",
  total_comments: 0,
});
const LATEST_COMMENTS_TTL = 300;
const COMMENT_SNIPPET_LIMIT = 220;

type CommentProfile = {
  level?: number;
  role?: string;
  is_premium?: boolean;
  xp?: number;
  username?: string;
  avatar_url?: string;
  total_comments?: number;
};

type LatestComment = {
  id: string;
  user_id?: string | null;
  slug?: string | null;
  content?: string | null;
  created_at?: string | null;
  is_spoiler?: boolean;
  author_name?: string | null;
  avatar_url?: string | null;
  profiles?: CommentProfile | null;
};

type TitleRushWinnerRow = {
  user_id: string;
  rank: number;
};

type CommentType = "admin" | "staff" | "premium" | "normal";
// ============================================
// PURE UTILITIES
// ============================================

export const parseSlug = (slug?: string | null) => {
  if (typeof slug !== "string") return { source: "komiku", realSlug: "" };
  const found = SUPPORTED_SOURCES.find((s) => slug.startsWith(s + "-"));
  if (found) return { source: found, realSlug: slug.slice(found.length + 1) };
  const adultPrefix = ADULT_SOURCE_PREFIXES.find((prefix) => slug.startsWith(prefix));
  if (adultPrefix) {
    return { source: "sekte", realSlug: slug.slice(adultPrefix.length) };
  }
  return { source: DEFAULT_SOURCE, realSlug: slug };
};

export const getLink = (slug?: string | null) => {
  if (!slug) return "#";
  let { source, realSlug } = parseSlug(slug);

  // Some older project comments were stored as `ikiru-project-<slug>`
  // because project pages previously inherited the default source. Treat the
  // explicit project marker as authoritative so those links remain valid.
  if (realSlug.startsWith("project-")) {
    source = "project";
    realSlug = realSlug.slice("project-".length);
  }

  const isChapter =
    realSlug.includes("/chapter-") || realSlug.includes("-chapter-");
  if (source === "meionovels") {
    return isChapter ? `/novel/chapter/${realSlug}` : `/novel/${realSlug}`;
  }
  return isChapter
    ? `/chapter/${source}/${realSlug}`
    : `/komik/${source}/${realSlug}`;
};

export const getProfileLink = (username?: string | null) =>
  username ? `/u/${encodeURIComponent(username)}` : null;

export const formatTitle = (slug?: string | null) => {
  let str = String(slug || "");
  if (!str) return "Judul Kosong";
  for (const prefix of SLUG_PREFIXES) {
    if (str.startsWith(prefix)) {
      str = str.slice(prefix.length);
      break;
    }
  }
  const slashIdx = str.indexOf("/chapter-");
  const dashIdx = str.indexOf("-chapter-");
  if (slashIdx !== -1) str = str.slice(0, slashIdx);
  else if (dashIdx !== -1) str = str.slice(0, dashIdx);
  return str.replace(/-/g, " ");
};

export const getChapter = (slug?: string | null) => {
  const str = String(slug || "");
  let m = CHAPTER_REGEX_1.exec(str);
  if (m) return `Ch. ${m[1]}`;
  m = CHAPTER_REGEX_2.exec(str);
  if (m) return `Ch. ${m[1]}`;
  return "";
};

export const parseContent = (text?: string | null): { texts: string; images: string[] } => {
  if (!text) return { texts: "", images: [] };
  const parts = text.split(/(\[https?:\/\/[^\]]+\])/g);
  const texts: string[] = [];
  const images: string[] = [];
  for (const part of parts) {
    if (URL_REGEX.test(part)) {
      const url = part.slice(1, -1);
      if (IMAGE_REGEX.test(url)) images.push(url);
      else texts.push(part);
    } else {
      texts.push(part);
    }
  }
  return { texts: texts.join(" ").trim(), images };
};

export const formatTime = (date?: string | null) => {
  if (!date) return "";
  let ds = date;
  if (typeof ds === "string" && !ds.endsWith("Z") && !ds.includes("+")) {
    ds = ds.replace(" ", "T") + "Z";
  }
  const d = new Date(ds);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}h lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

function compactContent(content?: string | null) {
  if (!content || content.length <= COMMENT_SNIPPET_LIMIT) return content || "";
  return `${content.slice(0, COMMENT_SNIPPET_LIMIT).trim()}...`;
}

// ============================================
// DATA FETCHING
// ============================================

const getLatestCommentsCached = unstable_cache(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("comments")
      .select("id, user_id, slug, content, created_at, is_spoiler, author_name, avatar_url, profiles(level, role, is_premium, xp, username, avatar_url)")
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("[LatestComments] Fetch error:", error.message);
      return [];
    }
    return ((data || []) as LatestComment[]).map((comment) => ({
      ...comment,
      content: compactContent(comment.content),
    }));
  },
  ["latest-comments"],
  { revalidate: LATEST_COMMENTS_TTL, tags: ["comments"] }
);

const getActiveTitleRushWinnersCached = unstable_cache(
  async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("title_rush_winners")
      .select("user_id, rank")
      .not("awarded_at", "is", null)
      .gte("awarded_at", since)
      .order("rank", { ascending: true })
      .limit(3);

    if (error) return [];
    return (data || []) as TitleRushWinnerRow[];
  },
  ["active-title-rush-winners"],
  { revalidate: 600, tags: ["title-rush-winners"] },
);

export async function getLatestComments() {
  return getLatestCommentsCached();
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * GIF background — opacity sangat rendah (0.10) +
 * dark overlay tebal supaya teks tetap bersih.
 */
/** Accent bar kiri — netral, biar gak rebutan warna sama GIF background */
function AccentBar({ type }: { type: CommentType }) {
  return (
    <div
      className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${
        type === "normal" ? "bg-white/[0.12]" : "bg-white/25"
      }`}
    />
  );
}

/** Avatar — TANPA dot hijau */
function CommentAvatar({
  avatarUrl,
  authorName,
  type,
}: {
  avatarUrl?: string | null;
  authorName?: string | null;
  type: CommentType;
}) {
  return (
    <div
      className={`w-10 h-10 rounded-xl border flex-shrink-0 overflow-hidden flex items-center justify-center text-[14px] font-semibold ${
        type === "normal"
          ? "border-white/[0.08] bg-white/[0.05] text-gray-500"
          : "border-white/20 bg-black/40 text-white/70"
      }`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          className="w-full h-full object-cover"
          alt=""
          loading="lazy"
        />
      ) : (
        authorName?.charAt(0).toUpperCase()
      )}
    </div>
  );
}

/** Badge role */
function RoleBadge({
  role,
  isPremium,
  titleRushRank,
  xpRank,
}: {
  role?: string;
  isPremium?: boolean;
  titleRushRank?: number | null;
  xpRank?: number | null;
}) {
  return (
    <UserBadges
      role={role}
      isPremium={isPremium}
      titleRushRank={titleRushRank}
      xpRank={xpRank}
    />
  );
}

/** Level + XP bar */
function LevelBadge({ level = 1, xp = 0 }: { level?: number; xp?: number }) {
  return (
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <span className="text-[10px] font-bold text-[var(--accent-2)] leading-none">
        Lvl {level}
      </span>
      <div className="w-8 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${xp % 100}%` }}
        />
      </div>
    </div>
  );
}

/** Card komentar */
function CommentCard({
  comment,
  titleRushRank,
  xpRank,
}: {
  comment: LatestComment;
  titleRushRank?: number | null;
  xpRank?: number | null;
}) {
  const profile = comment.profiles || DEFAULT_PROFILE;
  const authorName = profile.username || comment.author_name;
  const avatarUrl = profile.avatar_url || comment.avatar_url;
  const profileLink = getProfileLink(profile.username);
  const { texts, images } = parseContent(comment.content);

  const type: CommentType =
    profile.role === "admin"
      ? "admin"
      : profile.role === "staff"
      ? "staff"
      : profile.is_premium
      ? "premium"
      : "normal";

  const cardClass = [
    "rk-card-soft group relative overflow-visible rounded-2xl border hover:border-[var(--accent-2)]/20",
    type !== "normal" ? "border-white/15" : "",
  ].join(" ");

  return (
    <article className={`${cardClass} font-sans`}>
      <ExclusiveCommentWallpaper type={type} />
      <AccentBar type={type} />

      <div className="relative z-[1] flex gap-3 px-4 py-3.5">
        {profileLink ? (
          <ProfilePopover profile={profile} href={profileLink}>
            <CommentAvatar
              avatarUrl={avatarUrl}
              authorName={authorName}
              type={type}
            />
          </ProfilePopover>
        ) : (
          <CommentAvatar
            avatarUrl={avatarUrl}
            authorName={authorName}
            type={type}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Baris nama */}
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {profileLink ? (
                <ProfilePopover profile={profile} href={profileLink}>
                  <span className="truncate text-[13px] font-black leading-none text-gray-100 hover:text-cyan-200">
                    {authorName}
                  </span>
                </ProfilePopover>
              ) : (
                <span className="truncate text-[13px] font-black leading-none text-gray-100">
                  {authorName}
                </span>
              )}
              <RoleBadge
                role={profile.role}
                isPremium={profile.is_premium}
                titleRushRank={titleRushRank}
                xpRank={xpRank}
              />
            </div>
            <LevelBadge level={profile.level} xp={profile.xp} />
          </div>

          {/* Waktu */}
          <span
            className={`text-[11px] flex items-center gap-1 mb-2 ${
              type !== "normal" ? "text-white/35" : "text-gray-500"
            }`}
          >
            <FiClock className="w-3 h-3 flex-shrink-0" />
            {formatTime(comment.created_at)}
          </span>

          {/* Konten */}
          <Link prefetch={false} href={getLink(comment.slug)} className="block">
          {comment.is_spoiler ? (
            <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1.5">
              <FiAlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              <span className="text-orange-400 text-[11px] font-semibold uppercase tracking-wider">
                Spoiler Alert
              </span>
            </div>
          ) : (
            <>
              {texts && (
                <p
                  className={`text-[12.5px] leading-relaxed line-clamp-2 ${
                    type !== "normal" ? "text-white/60" : "text-gray-400"
                  }`}
                >
                  {texts}
                </p>
              )}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="stiker"
                      loading="lazy"
                      className="w-12 h-12 object-cover rounded-lg border border-white/10"
                    />
                  ))}
                </div>
              )}
              {!texts && images.length === 0 && (
                <p className="text-[12px] text-gray-600 italic">—</p>
              )}
            </>
          )}
          </Link>

          {/* Footer judul manga */}
          <div className="mt-2.5 flex items-center gap-2">
            <div
              className={`h-px flex-1 ${
                type !== "normal" ? "bg-white/[0.07]" : "bg-white/[0.06]"
              }`}
            />
            <Link
              prefetch={false}
              href={getLink(comment.slug)}
              className="flex max-w-[180px] items-center gap-1 truncate text-[11px] font-medium text-[var(--accent)]/80 opacity-75 hover:opacity-100"
            >
              <FiBookOpen className="w-3 h-3 flex-shrink-0" />
              {formatTitle(comment.slug)} {getChapter(comment.slug)}
            </Link>
            <div
              className={`h-px flex-1 ${
                type !== "normal" ? "bg-white/[0.07]" : "bg-white/[0.06]"
              }`}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Skeleton */
function CommentsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rk-card-soft h-[96px] rounded-2xl px-4 py-3.5"
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 bg-white/5 rounded w-1/3" />
              <div className="h-2.5 bg-white/5 rounded w-2/3" />
              <div className="h-2.5 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Error */
function CommentsError() {
  return (
    <div className="text-center py-10">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
        <FiAlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-red-400 text-sm font-medium">Gagal memuat komentar</p>
      <p className="text-gray-600 text-xs mt-1">Coba refresh halaman</p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default async function LatestComments() {
  let comments = [];
  let titleRushWinners: TitleRushWinnerRow[] = [];
  let xpLeaders: XpLeaderRow[] = [];
  let hasError = false;

  try {
    [comments, titleRushWinners, xpLeaders] = await Promise.all([
      getLatestComments(),
      getActiveTitleRushWinnersCached(),
      getXpLeadersCached(),
    ]);
  } catch (err) {
    console.error("[LatestComments] Render error:", err);
    hasError = true;
  }
  const titleRushRankByUser = new Map(
    titleRushWinners.map((winner) => [winner.user_id, winner.rank]),
  );
  const xpRankByUser = new Map(
    xpLeaders.map((leader, index) => [leader.id, index + 1]),
  );

  return (
    <div className="mx-auto mt-5 max-w-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
         
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
              Community
            </p>
            <h2 className="text-xl font-black text-white tracking-tight">
            Komentar Terbaru
            </h2>
          </div>
  
        </div>
        <Link
          prefetch={false}
          href="/leaderboard"
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-3 py-1.5 text-[11px] font-bold text-[var(--accent-2)] transition hover:bg-[var(--accent-2)]/15"
        >
          <FiAward className="w-3.5 h-3.5" />
          Leaderboard
          <FiChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <Suspense fallback={<CommentsSkeleton />}>
        {hasError ? (
          <CommentsError />
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
              <FiMessageSquare className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">Belum ada komentar</p>
            <p className="text-gray-600 text-xs mt-1">
              Jadilah yang pertama berkomentar
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                titleRushRank={titleRushRankByUser.get(comment.user_id || "")}
                xpRank={xpRankByUser.get(comment.user_id || "")}
              />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
