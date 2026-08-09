import Link from "next/link";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  getPublicProfileByUsernameCached,
  type PublicProfileRow,
} from "@/lib/profileServerCache";
import UserBadges from "@/components/UserBadges";
import PublicProfileShare from "@/components/profile/PublicProfileShare";
import PublicCollectionsTabs from "@/components/profile/PublicCollectionsTabs";
import ProfilePopover from "@/components/profile/ProfilePopover";
import ExclusiveCommentWallpaper from "@/components/ExclusiveCommentWallpaper";
import {
  FiAward,
  FiAlertTriangle,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiMessageSquare,
} from "react-icons/fi";

const XP_PER_LEVEL = 100;
const BRACKET_URL_REGEX = /\[(https?:\/\/[^\]]+)\]/g;
const PUBLIC_PROFILE_TTL = 300;
const PUBLIC_COLLECTION_ITEM_LIMIT = 8;

export const revalidate = 300;

type RouteProps = {
  params: Promise<{ username: string }>;
};

type Profile = PublicProfileRow;

type CommentRow = {
  id: string;
  slug?: string | null;
  content?: string | null;
  created_at?: string | null;
  is_spoiler?: boolean | null;
};

type ProfileType = "admin" | "premium" | "normal";

type PublicCollectionItem = {
  source?: string;
  slug?: string;
  title?: string;
  image?: string;
  position?: number | null;
  created_at?: string | null;
};

type PublicCollection = {
  id?: string;
  name?: string;
  updated_at?: string | null;
  user_collection_items?: PublicCollectionItem[];
};

type TitleRushScoreRow = {
  user_id: string;
  rank: number;
};

type PublicProfileData = {
  profile: Profile;
  showReads: boolean;
  showComments: boolean;
  showJoinDate: boolean;
  totalReads: number | null;
  totalComments: number | null;
  comments: CommentRow[];
  publicCollections: PublicCollection[];
  titleRushRank: number | null;
  xpRank: number;
};

const SITE_URL = "https://www.ryukomik.my.id";

function formatDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date?: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function getActiveTitleSince() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function parseSlug(slug?: string | null) {
  if (!slug || typeof slug !== "string") return { source: "komiku", realSlug: "" };
  const sources = ["kiryuu", "komikid", "komiku", "luvyaa", "sekte", "doujindesu", "meionovels"];
  const found = sources.find((source) => slug.startsWith(`${source}-`));
  if (found) return { source: found, realSlug: slug.slice(found.length + 1) };
  const adultPrefix = ["doujindesu-", "sektedoujin-"].find((prefix) =>
    slug.startsWith(prefix),
  );
  if (adultPrefix) {
    return { source: "sekte", realSlug: slug.slice(adultPrefix.length) };
  }
  return { source: "komiku", realSlug: slug };
}

function getContentLink(comment: CommentRow) {
  const { source, realSlug } = parseSlug(comment.slug);
  const isChapter = realSlug.includes("/chapter-") || realSlug.includes("-chapter-");

  if (source === "meionovels") {
    return isChapter ? `/novel/chapter/${realSlug}` : `/novel/${realSlug}`;
  }

  return isChapter ? `/chapter/${source}/${realSlug}` : `/komik/${source}/${realSlug}`;
}

function formatTitle(slug?: string | null) {
  const { realSlug } = parseSlug(slug);
  const title = realSlug.split("/chapter-")[0].split("-chapter-")[0];
  return title ? title.replace(/-/g, " ") : "Komentar";
}

function parseCommentContent(content?: string | null): { text: string; images: string[] } {
  if (!content) return { text: "", images: [] };

  const images: string[] = [];
  const text = content
    .replace(BRACKET_URL_REGEX, (_match, url) => {
      images.push(url);
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  return { text, images };
}

const getPublicProfileDataCached = unstable_cache(
  async (username: string): Promise<PublicProfileData | null> => {
    const profile = await getPublicProfileByUsernameCached(username);

    if (!profile) return null;

    const showReads = profile.show_public_reads !== false;
    const showComments = profile.show_public_comments !== false;
    const showJoinDate = profile.show_public_join_date !== false;

    const [
      readsResult,
      commentsCountResult,
      commentsResult,
      collectionsResult,
      titleRushResult,
      xpRankResult,
    ] = await Promise.all([
      showReads
        ? supabaseAdmin
            .from("user_reads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id)
        : Promise.resolve({ count: null }),
      showComments
        ? supabaseAdmin
            .from("comments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id)
        : Promise.resolve({ count: null }),
      showComments
        ? supabaseAdmin
            .from("comments")
            .select("id, slug, content, created_at, is_spoiler")
            .eq("user_id", profile.id)
            .is("parent_id", null)
            .order("created_at", { ascending: false })
            .limit(6)
        : Promise.resolve({ data: [] }),
      supabaseAdmin
        .from("user_collections")
        .select("id, name, updated_at")
        .eq("user_id", profile.id)
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(4),
      supabaseAdmin
        .from("title_rush_winners")
        .select("user_id, rank")
        .not("awarded_at", "is", null)
        .gte("awarded_at", getActiveTitleSince())
        .order("rank", { ascending: true })
        .limit(3),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("xp", profile.xp || 0),
    ]);

    const collectionRows = (collectionsResult.data || []) as PublicCollection[];
    const collectionItems = await Promise.all(
      collectionRows.map(async (collection) => {
        if (!collection.id) return { id: collection.id, items: [] as PublicCollectionItem[] };
        const { data } = await supabaseAdmin
          .from("user_collection_items")
          .select("source, slug, title, image, position, created_at")
          .eq("collection_id", collection.id)
          .order("position", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(PUBLIC_COLLECTION_ITEM_LIMIT);

        return {
          id: collection.id,
          items: (data || []) as PublicCollectionItem[],
        };
      }),
    );
    const itemsByCollection = new Map(
      collectionItems.map((collection) => [collection.id, collection.items]),
    );

    const publicCollections = collectionRows.map((collection) => ({
      ...collection,
      user_collection_items: itemsByCollection.get(collection.id) || [],
    }));
    const titleRushRank =
      ((titleRushResult.data || []) as TitleRushScoreRow[]).find(
        (row) => row.user_id === profile.id,
      )?.rank || null;

    return {
      profile,
      showReads,
      showComments,
      showJoinDate,
      totalReads: readsResult.count ?? null,
      totalComments: commentsCountResult.count ?? null,
      comments: (commentsResult.data || []) as CommentRow[],
      publicCollections,
      titleRushRank,
      xpRank: (xpRankResult.count ?? 0) + 1,
    };
  },
  ["public-profile-v2"],
  { revalidate: PUBLIC_PROFILE_TTL, tags: ["public-profile", "comments"] },
);

function getProfileType(profile: Profile): ProfileType {
  if (profile.role === "admin") return "admin";
  if (profile.is_premium) return "premium";
  return "normal";
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  const name = profile.username || "User";

  return (
    <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 ring-4 ring-white/[0.03]">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-3xl font-black text-white/45">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function RoleBadges({
  profile,
  titleRushRank,
  xpRank,
}: {
  profile: Profile;
  titleRushRank?: number | null;
  xpRank?: number | null;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <UserBadges
        role={profile.role}
        isPremium={profile.is_premium}
        titleRushRank={titleRushRank}
        xpRank={xpRank}
      />
    </div>
  );
}

function RoleBadge({ profile }: { profile: Profile }) {
  if (profile.role === "admin") {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--accent-3)]/25 bg-[var(--accent-3)]/12 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-[var(--accent-3)]">
        ADMIN
      </span>
    );
  }
  if (profile.is_premium || profile.role === "admin") {
    return <UserBadges role={profile.role} isPremium={profile.is_premium} />;
  }
  return null;
}

function CommentAvatar({ profile, type }: { profile: Profile; type: ProfileType }) {
  const name = profile.username || "User";
  const border =
    type === "admin"
      ? "border-[var(--accent-3)]/35"
      : type === "premium"
        ? "border-[var(--accent)]/35"
        : "border-white/[0.08]";
  const fallback =
    type === "admin"
      ? "bg-[var(--accent-3)]/10 text-[var(--accent-3)]"
      : type === "premium"
        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
        : "bg-white/[0.05] text-white/45";

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-[14px] font-semibold ${border} ${fallback}`}
    >
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          className="h-full w-full object-cover"
          alt={name}
          loading="lazy"
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function AccentBar({ type }: { type: ProfileType }) {
  const barColor =
    type === "admin"
      ? "bg-[var(--accent-3)]"
      : type === "premium"
        ? "bg-[var(--accent)]"
        : "bg-[var(--accent-2)]/30";

  return (
    <div className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-full ${barColor}`} />
  );
}

function LevelBadge({ level, xp }: { level?: number | null; xp?: number | null }) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className="text-[10px] font-bold leading-none text-[var(--accent-2)]">
        Lvl {level || 1}
      </span>
      <div className="h-[3px] w-8 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${(xp || 0) % 100}%` }}
        />
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rk-card-soft rounded-2xl p-4 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[var(--accent-2)]">
        {icon}
      </div>
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
        {label}
      </p>
    </div>
  );
}

function XpPanel({ profile }: { profile: Profile }) {
  const currentXP = (profile.xp || 0) % XP_PER_LEVEL;
  const pct = Math.min((currentXP / XP_PER_LEVEL) * 100, 100);

  return (
    <div className="rk-card-soft mt-5 rounded-2xl p-4">
      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm font-black text-[var(--accent-2)]">
          Level {profile.level || 1}
        </span>
        <span className="text-xs text-white/45">
          {currentXP} / {XP_PER_LEVEL} XP
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/5 p-[2px]">
        <div
          className="h-full rounded-full bg-[var(--accent-2)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CommentPreview({ comment, profile }: { comment: CommentRow; profile: Profile }) {
  const parsed = parseCommentContent(comment.content);
  const type = getProfileType(profile);
  const profileHref = `/u/${encodeURIComponent(profile.username)}`;
  const cardClass = [
    "rk-card-soft group relative overflow-visible rounded-2xl border transition-colors duration-200",
    type === "admin"
      ? "border-[var(--accent-3)]/30 hover:border-[var(--accent-3)]/40"
      : type === "premium"
        ? "border-[var(--accent)]/30 hover:border-[var(--accent)]/40"
        : "hover:border-[var(--accent-2)]/20",
  ].join(" ");

  return (
    <article className={cardClass}>
      <ExclusiveCommentWallpaper type={type} />
      <AccentBar type={type} />

      <div className="relative z-[1] flex gap-3 px-4 py-3.5">
        <ProfilePopover profile={profile} href={profileHref}>
          <CommentAvatar profile={profile} type={type} />
        </ProfilePopover>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <ProfilePopover profile={profile} href={profileHref}>
                <span
                  className={`truncate text-[13px] font-black leading-none transition-colors duration-200 hover:text-[var(--accent-2)] ${
                  type === "admin"
                    ? "text-[var(--accent-3)]"
                    : type === "premium"
                      ? "text-white"
                      : "text-white/90"
                }`}
                >
                  {profile.username}
                </span>
              </ProfilePopover>
              <RoleBadge profile={profile} />
            </div>
            <LevelBadge level={profile.level} xp={profile.xp} />
          </div>

          <span
            className={`mb-2 flex items-center gap-1 text-[11px] ${
              type !== "normal" ? "text-white/35" : "text-white/45"
            }`}
          >
            <FiClock className="h-3 w-3 shrink-0" />
            {formatTime(comment.created_at)}
          </span>

          <Link href={getContentLink(comment)} className="block">
            {comment.is_spoiler ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-[color:color-mix(in_srgb,var(--accent-3)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-3)_10%,transparent)] px-2.5 py-1.5">
                <FiAlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--accent-3)]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-3)]">
                  Spoiler Alert
                </span>
              </div>
            ) : (
              <>
                {parsed.text && (
                  <p
                    className={`line-clamp-2 text-[12.5px] leading-relaxed ${
                      type !== "normal" ? "text-white/60" : "text-white/55"
                    }`}
                  >
                    {parsed.text}
                  </p>
                )}
                {parsed.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {parsed.images.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="Lampiran komentar"
                        loading="lazy"
                        className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                      />
                    ))}
                  </div>
                )}
                {!parsed.text && parsed.images.length === 0 && (
                  <p className="text-[12px] italic text-white/30">-</p>
                )}
              </>
            )}
          </Link>

          <div className="mt-2.5 flex items-center gap-2">
            <div
              className={`h-px flex-1 ${
                type !== "normal" ? "bg-white/[0.07]" : "bg-white/[0.06]"
              }`}
            />
            <Link
              href={getContentLink(comment)}
              className="flex max-w-[180px] items-center gap-1 truncate text-[11px] font-medium capitalize text-[var(--accent)]/80 opacity-75 transition-opacity duration-200 hover:opacity-100"
            >
              <FiBookOpen className="h-3 w-3 shrink-0" />
              {formatTitle(comment.slug)}
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

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername || "").trim();
  if (!username) {
    return {
      title: "Profil Ryukomik",
    };
  }

  const profile = await getPublicProfileByUsernameCached(username);
  const displayName = profile?.username || username;
  const title = `${displayName} - Profil Ryukomik`;
  const description = `${displayName} di Ryukomik${profile?.level ? `, Level ${profile.level}` : ""}${profile?.is_premium ? " Premium" : ""}. Lihat profil publik, komentar, dan koleksi komik.`;
  const url = `${SITE_URL}/u/${encodeURIComponent(displayName)}`;
  const image = profile?.avatar_url || `${SITE_URL}/icon.png?v=20260523`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Ryukomik",
      type: "profile",
      locale: "id_ID",
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: `${displayName} di Ryukomik`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image],
    },
  };
}

export default async function PublicProfilePage({ params }: RouteProps) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername || "").trim();
  if (!username) notFound();

  const data = await getPublicProfileDataCached(username);
  if (!data) notFound();

  const {
    profile,
    showReads,
    showComments,
    showJoinDate,
    totalReads,
    totalComments,
    comments,
    publicCollections,
    titleRushRank,
    xpRank,
  } = data;

  return (
    <div className="rk-page px-4 pb-24 pt-20 text-white">
      <div className="rk-shell max-w-2xl">
        <section className="rk-card relative overflow-hidden rounded-3xl px-5 py-8 text-center">
          <div className="absolute inset-x-10 top-0 h-px bg-white/10" />
          <ProfileAvatar profile={profile} />
          <h1 className="mt-4 text-2xl font-black">{profile.username}</h1>
          {showJoinDate && (
            <p className="mt-1 text-xs text-white/45">
              Bergabung sejak {formatDate(profile.created_at)}
            </p>
          )}
          <RoleBadges
            profile={profile}
            titleRushRank={titleRushRank}
            xpRank={xpRank <= 3 ? xpRank : null}
          />
          <XpPanel profile={profile} />
          <PublicProfileShare username={profile.username} />
        </section>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatTile
            icon={<FiBookOpen />}
            label="Dibaca"
            value={showReads ? totalReads ?? 0 : "-"}
          />
          <StatTile
            icon={<FiMessageSquare />}
            label="Komentar"
            value={showComments ? totalComments ?? profile.total_comments ?? 0 : "-"}
          />
          <StatTile
            icon={<FiAward />}
            label="Level"
            value={profile.level || 1}
          />
        </div>

        <PublicCollectionsTabs collections={publicCollections} />

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:color-mix(in_srgb,var(--accent-2)_60%,transparent)]">
              Komentar Terbaru
            </p>
            <div className="flex items-center gap-1 text-[10px] text-white/30">
              <FiCalendar />
              Aktivitas publik
            </div>
          </div>

          {!showComments ? (
            <div className="rk-card-soft rounded-2xl p-6 text-center text-sm text-white/40">
              Komentar terbaru disembunyikan oleh user.
            </div>
          ) : comments?.length ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <CommentPreview key={comment.id} comment={comment} profile={profile} />
              ))}
            </div>
          ) : (
            <div className="rk-card-soft rounded-2xl p-6 text-center text-sm text-white/40">
              Belum ada komentar publik.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
