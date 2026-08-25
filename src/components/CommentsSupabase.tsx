"use client";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import ExclusiveCommentWallpaper from "@/components/ExclusiveCommentWallpaper";
import LoginModal from "@/components/LoginModal";
import UserBadges from "@/components/UserBadges";
import ProfilePopover from "@/components/profile/ProfilePopover";
import Button from "@/components/Button";
import { stickers } from "@/data/stickers";
import { RiEmojiStickerLine } from "react-icons/ri";
import { loadCachedProfile } from "@/utils/profileCache";

// ============================================
// CONSTANTS
// ============================================
const SORT_OPTIONS = [
  { key: "new", label: "Terbaru" },
] as const;

type CommentSort = (typeof SORT_OPTIONS)[number]["key"];

type Profile = {
  username?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  role?: string | null;
  is_premium?: boolean | null;
  xp?: number | null;
};

type CommentRow = {
  id: string;
  content?: string | null;
  created_at?: string | null;
  is_spoiler?: boolean | null;
  author_name?: string | null;
  avatar_url?: string | null;
  user_id?: string | null;
  parent_id?: string | null;
  profiles?: Profile | null;
  replies?: CommentRow[];
};

type CommentsSupabaseProps = {
  type?: string;
  slug: string;
  chapter?: string;
};

type UserInfoProps = {
  user: User;
  profile?: Profile | null;
};

type StickerPickerProps = {
  onSelect: (text: string) => void;
  onClose: () => void;
};

type CommentContentProps = {
  text?: string | null;
  isSpoiler?: boolean | null;
  openSpoiler: boolean;
  onOpenSpoiler: () => void;
};

type CommentType = "admin" | "staff" | "premium" | "normal";

type CommentAvatarProps = {
  avatar_url?: string | null;
  author_name?: string | null;
  type?: CommentType;
};

type CommentBadgeProps = {
  role?: string | null;
  isPremium?: boolean | null;
  titleRushRank?: number | null;
  xpRank?: number | null;
};

type CommentItemProps = {
  data: CommentRow;
  replying: string | null;
  setReplying: Dispatch<SetStateAction<string | null>>;
  replyContent: string;
  setReplyContent: Dispatch<SetStateAction<string>>;
  submitReply: (parentId?: string | null) => Promise<void>;
  user: User | null;
  titleRushRank?: number | null;
  xpRank?: number | null;
  isReply?: boolean;
};

const IMAGE_REGEX = /\.(jpg|jpeg|png|webp|gif)$/i;
const URL_REGEX = /^\[https?:\/\/[^\]]+\]$/;
// ============================================
// UTILITY FUNCTIONS (outside component)
// ============================================
const formatTime = (rawDate?: string | null) => {
  if (!rawDate) return "";
  let dateStr = rawDate;
  if (typeof dateStr === "string" && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
    dateStr = dateStr.replace(" ", "T") + "Z";
  }
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

const validateImageUrl = (url: string) => {
  if (!url.trim()) return "Link tidak boleh kosong";
  if (!url.startsWith("http") || !IMAGE_REGEX.test(url)) return "Link tidak valid";
  return null;
};

// ============================================
// MEMOIZED SUB-COMPONENTS
// ============================================

const RulesBox = memo(() => (
  <div className="rk-card-soft mt-3 rounded-2xl p-4">
    <h3 className="flex items-center gap-2 text-lg font-black text-[var(--accent-2)]">
      <span>⚠️</span> Rules Komentar
    </h3>
    <p className="mt-2 border-l-2 border-rose-400 pl-2 text-xs italic text-white/55">
      Dilarang toxic, rasis, spoiler berlebih, atau politik. Pelanggar kena BAN permanen.
    </p>
  </div>
));
RulesBox.displayName = "RulesBox";

const UserInfo = memo(({ user, profile }: UserInfoProps) => {
  const displayName = profile?.username || user.user_metadata.full_name || user.user_metadata.name || "Member";
  const avatarUrl = profile?.avatar_url || user.user_metadata.avatar_url;

  return (
  <div className="flex items-center gap-3 mb-4">
    {avatarUrl ? (
      <img
        src={avatarUrl}
        className="w-9 h-9 rounded-full ring-2 ring-cyan-300/20"
        alt="me"
        loading="lazy"
      />
    ) : (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white/50 ring-2 ring-cyan-300/20">
        {displayName.charAt(0).toUpperCase()}
      </div>
    )}
    <span className="text-sm font-bold text-gray-200">
      {displayName}
    </span>
  </div>
  );
});
UserInfo.displayName = "UserInfo";

const StickerPicker = memo(({ onSelect, onClose }: StickerPickerProps) => {
  const [stickerTab, setStickerTab] = useState("sticker");
  const [imageUrl, setImageUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddLink = useCallback(() => {
    setErrorMsg("");
    const error = validateImageUrl(imageUrl);
    if (error) return setErrorMsg(error);
    onSelect(` [${imageUrl}] `);
    setImageUrl("");
    onClose();
  }, [imageUrl, onSelect, onClose]);

  return (
    <div className="rk-card absolute bottom-12 left-0 z-50 w-64 rounded-2xl p-3">
      <div className="mb-2 flex rounded-xl bg-black/25 p-1">
        {["sticker", "link"].map((tab) => (
          <button
            key={tab}
            onClick={() => { setStickerTab(tab); setErrorMsg(""); }}
            className={`flex-1 text-xs py-1 rounded transition-colors duration-200 ${
              stickerTab === tab ? "bg-[var(--accent)]/25 text-[var(--accent-2)]" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab === "sticker" ? "Sticker" : "Link"}
          </button>
        ))}
      </div>

      {stickerTab === "sticker" && (
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-auto p-1">
          {stickers?.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="stiker"
              loading="lazy"
              className="w-full h-14 object-cover rounded cursor-pointer"
              onClick={() => { onSelect(` [${url}] `); onClose(); }}
            />
          ))}
        </div>
      )}

      {stickerTab === "link" && (
        <div className="flex flex-col items-center gap-2">
          {imageUrl && (
            <img src={imageUrl} className="w-24 h-24 object-cover rounded border" alt="preview" />
          )}
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://gambar.jpg"
            className="rk-input w-full rounded-xl p-2 text-xs"
          />
          {errorMsg && <p className="text-red-400 text-[10px]">{errorMsg}</p>}
          <Button
            onClick={handleAddLink}
            className="w-full rounded-xl p-1.5 text-xs font-bold"
          >
            Tambah
          </Button>
        </div>
      )}
    </div>
  );
});
StickerPicker.displayName = "StickerPicker";

const CommentContent = memo(({ text, isSpoiler, openSpoiler, onOpenSpoiler }: CommentContentProps) => {
  const parsed = useMemo(() => {
    if (!text) return { texts: [], images: [] };
    const parts = text.split(/(\[https?:\/\/[^\]]+\])/g);
    const texts: string[] = [];
    const images: string[] = [];
    parts.forEach((part) => {
      if (URL_REGEX.test(part)) {
        const url = part.slice(1, -1);
        if (IMAGE_REGEX.test(url)) images.push(url);
        else texts.push(part);
      } else {
        texts.push(part);
      }
    });
    return { texts, images };
  }, [text]);

  if (isSpoiler && !openSpoiler) {
    return (
      <div
        onClick={onOpenSpoiler}
        className="bg-black/60 border border-orange-500/20 rounded-xl p-3 cursor-pointer hover:bg-black/80 text-center group transition-colors duration-200"
      >
        <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest block">
          ⚠️ Konten Spoiler
        </span>
        <span className="text-[8px] text-gray-500 transition-colors duration-200 group-hover:text-white">
          Klik untuk melihat
        </span>
      </div>
    );
  }

  return (
    <div className={isSpoiler ? "text-orange-200 bg-orange-500/5 p-2 rounded-lg border border-orange-500/10" : ""}>
      {parsed.texts.join(" ").trim() && <p className="mb-2">{parsed.texts.join(" ")}</p>}
      {parsed.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {parsed.images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="img"
              loading="lazy"
              onClick={() => window.open(url, "_blank")}
              className="w-24 h-auto rounded-lg border border-white/10 cursor-pointer"
            />
          ))}
        </div>
      )}
    </div>
  );
});
CommentContent.displayName = "CommentContent";

const CommentAvatar = memo(({ avatar_url, author_name, type = "normal" }: CommentAvatarProps) => {
  const isNormal = type === "normal";

  return (
    <div
      className={`h-10 w-10 shrink-0 overflow-hidden rounded-xl border flex items-center justify-center ${
        isNormal ? "border-white/[0.08] bg-neutral-800" : "border-white/20 bg-black/40"
      }`}
    >
      {avatar_url ? (
        <img src={avatar_url} className="w-full h-full object-cover" alt="av" loading="lazy" />
      ) : (
        <span className="text-xs font-bold text-gray-500">
          {author_name?.charAt(0)}
        </span>
      )}
    </div>
  );
});
CommentAvatar.displayName = "CommentAvatar";

/** Accent bar kiri — netral, biar gak rebutan warna sama GIF background */
const AccentBar = memo(({ type }: { type: CommentType }) => (
  <div
    className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${
      type === "normal" ? "bg-white/[0.12]" : "bg-white/25"
    }`}
  />
));
AccentBar.displayName = "AccentBar";

const CommentBadge = memo(({ role, isPremium, titleRushRank, xpRank }: CommentBadgeProps) => {
  return (
    <UserBadges
      role={role}
      isPremium={isPremium}
      titleRushRank={titleRushRank}
      xpRank={xpRank}
    />
  );
});
CommentBadge.displayName = "CommentBadge";

const getProfileHref = (username?: string | null) =>
  username ? `/u/${encodeURIComponent(username)}` : null;

// ============================================
// COMMENT ITEM (Memoized)
// ============================================
const CommentItem = memo(({
  data,
  replying,
  setReplying,
  replyContent,
  setReplyContent,
  submitReply,
  user,
  titleRushRank,
  xpRank,
  isReply = false,
}: CommentItemProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const [openSpoiler, setOpenSpoiler] = useState(false);

  const profile = data.profiles || { level: 1, role: "user", is_premium: false, xp: 0 };
  const displayName = profile.username || data.author_name;
  const avatarUrl = profile.avatar_url || data.avatar_url;
  const profileHref = getProfileHref(profile.username);
  const type: CommentType =
    profile.role === "admin"
      ? "admin"
      : profile.role === "staff"
      ? "staff"
      : profile.is_premium
      ? "premium"
      : "normal";
  const xpPercentage = (profile.xp ?? 0) % 100;
  const hasReplies = (data.replies?.length ?? 0) > 0;
  const isReplying = replying === data.id;

  const handleReplyToggle = useCallback(() => {
    setReplying(isReplying ? null : data.id);
  }, [isReplying, data.id, setReplying]);

  const handleSubmitReply = useCallback(() => {
    submitReply(data.id);
  }, [submitReply, data.id]);

  const cardBorderClass = type !== "normal" ? "border-white/15" : "";

  return (
    <div className={isReply ? "ml-10 md:ml-14 border-l-2 border-white/5 pl-4" : ""}>
      <div className={`rk-card-soft relative overflow-visible rounded-2xl border p-4 ${cardBorderClass}`}>
        <ExclusiveCommentWallpaper type={type} />
        <AccentBar type={type} />
        <div className="relative z-[1] flex gap-3">
          {profileHref ? (
            <ProfilePopover profile={profile} href={profileHref}>
              <CommentAvatar avatar_url={avatarUrl} author_name={displayName} type={type} />
            </ProfilePopover>
          ) : (
            <CommentAvatar avatar_url={avatarUrl} author_name={displayName} type={type} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {profileHref ? (
                  <ProfilePopover profile={profile} href={profileHref}>
                    <span className="truncate text-[13px] font-black text-white transition-colors duration-200 hover:text-cyan-200">
                    {displayName}
                    </span>
                  </ProfilePopover>
                ) : (
                  <span className="truncate text-[13px] font-black text-white">
                    {displayName}
                  </span>
                )}
                <CommentBadge
                  role={profile.role}
                  isPremium={profile.is_premium}
                  titleRushRank={titleRushRank}
                  xpRank={xpRank}
                />
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] font-bold text-[var(--accent-2)] leading-none">Lvl {profile.level}</span>
                <div className="w-8 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${xpPercentage}%` }} />
                </div>
              </div>
            </div>

            <span className="text-[9px] text-gray-500 italic font-medium">
              {formatTime(data.created_at)}
            </span>

            <div className="text-[14px] text-gray-300 leading-relaxed font-medium py-1">
              <CommentContent
                text={data.content}
                isSpoiler={data.is_spoiler}
                openSpoiler={openSpoiler}
                onOpenSpoiler={() => setOpenSpoiler(true)}
              />
            </div>

            <div className="mt-3 flex items-center gap-4">
              {!isReply && (
                <button
                  onClick={handleReplyToggle}
                  className="text-[10px] font-black text-[var(--accent-2)] hover:text-white uppercase tracking-tighter transition-colors duration-200"
                >
                  Balas
                </button>
              )}
              {hasReplies && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-tighter transition-colors duration-200"
                >
                  {showReplies ? "Tutup" : `${data.replies?.length ?? 0} Balasan`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isReplying && (
        <div className="mt-3 ml-4">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Ketik balasan..."
            className="rk-input w-full rounded-2xl p-3 text-xs"
          />
          <div className="flex justify-end mt-2 gap-2">
            <button
              onClick={() => setReplying(null)}
              className="text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase px-3 transition-colors duration-200"
            >
              Batal
            </button>
            <Button
              onClick={handleSubmitReply}
              className="rounded-xl px-4 py-1.5 text-[10px] font-black uppercase"
            >
              Kirim
            </Button>
          </div>
        </div>
      )}

      {showReplies && hasReplies && (
        <div className="mt-2 space-y-2">
          {data.replies?.map((r) => (
            <CommentItem
              key={r.id}
              data={r}
              isReply={true}
              user={user}
              titleRushRank={titleRushRank}
              xpRank={xpRank}
              replying={replying}
              setReplying={setReplying}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              submitReply={submitReply}
            />
          ))}
        </div>
      )}
    </div>
  );
});
CommentItem.displayName = "CommentItem";

const PremiumPromoComment = memo(() => {
  return (
    <div className="relative overflow-visible rounded-2xl border border-[var(--accent)]/35 p-4 rk-card-soft">
      <ExclusiveCommentWallpaper type="premium" />
      <AccentBar type="premium" />
      <div className="relative z-[1] flex gap-3">
        <div className="shrink-0 flex flex-col items-center">
          <CommentAvatar avatar_url="/icon.png" author_name="Ryukomik" type="premium" />
          <span className="mt-1 text-[9px] font-black text-[var(--accent-2)]">OFFICIAL</span>
          <div className="mt-1 h-1 w-11 overflow-hidden rounded-full border border-white/5 bg-white/10">
            <div className="h-full w-full bg-[var(--accent)]" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[13px] font-black text-white">Ryukomik</span>
              <CommentBadge role={null} isPremium={true} />
              <span className="rounded-full border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--accent-2)]">
                Disematkan
              </span>
            </div>
          </div>

          <p className="py-1 text-[14px] font-medium leading-relaxed text-gray-300">
            Mau baca lebih nyaman tanpa iklan? Aktifkan Ryukomik Premium dan bantu kami terus update setiap hari.
          </p>

          <a
            href="https://ryukomik.my.id/premium-pay"
            className="rk-btn-primary mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide"
          >
            <span>✦</span> Lihat Premium
          </a>
        </div>
      </div>
    </div>
  );
});
PremiumPromoComment.displayName = "PremiumPromoComment";

// ============================================
// MAIN COMPONENT
// ============================================
export default function CommentsSupabase({ type = "komik", slug, chapter }: CommentsSupabaseProps) {
  // ---- State ----
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [sort, setSort] = useState<CommentSort>("new");
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const { user } = useSupabaseUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [titleRushRanks, setTitleRushRanks] = useState<Map<string, number>>(new Map());
  const [xpRanks, setXpRanks] = useState<Map<string, number>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const compoundSlug = useMemo(() => `${slug}`, [slug]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user?.id) {
        setProfile(null);
        return;
      }

      const data = await loadCachedProfile(user.id);
      if (mounted) setProfile(data || null);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // ---- Build comment map for O(1) lookup ----
  const commentMap = useMemo(() => {
    const map = new Map<string, CommentRow>();
    const traverse = (list: CommentRow[]) => {
      list.forEach((c) => {
        map.set(c.id, c);
        if (c.replies?.length) traverse(c.replies);
      });
    };
    traverse(comments);
    return map;
  }, [comments]);

  // ---- Load Comments ----
  const loadComments = useCallback(async (fresh = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("sort", sort);
    params.set("slug", compoundSlug);
    if (chapter) params.set("chapter", chapter);
    if (fresh) params.set("v", String(Date.now()));

    try {
      const res = await fetch(`/api/comments?${params.toString()}`);
      const raw = (await res.json()) as unknown;
      const data = Array.isArray(raw) ? (raw as CommentRow[]) : [];

      const root = data.filter((c) => !c.parent_id);
      const replies = data.filter((c) => c.parent_id);

      root.forEach((c) => {
        c.replies = replies.filter((r) => r.parent_id === c.id);
      });

      setComments(root);
    } catch (err) {
      console.error("Load Error:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [type, compoundSlug, chapter, sort]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    let mounted = true;

    async function loadBadges() {
      const res = await fetch("/api/comment-badges");
      const data = (await res.json()) as {
        titleRushWinners?: Array<{ user_id: string; rank: number }>;
        xpLeaders?: Array<{ id: string }>;
      };

      if (!mounted) return;
      setTitleRushRanks(
        new Map((data.titleRushWinners || []).map((winner) => [winner.user_id, winner.rank])),
      );
      setXpRanks(
        new Map((data.xpLeaders || []).map((leader, index) => [leader.id, index + 1])),
      );
    }

    loadBadges();

    return () => {
      mounted = false;
    };
  }, []);

  // ---- Insert to textarea ----
  const insertToTextarea = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = content.substring(0, start) + text + content.substring(end);
    setContent(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + text.length;
      textarea.setSelectionRange(pos, pos);
    });
  }, [content]);

  // ---- Submit Handler ----
  const handleSubmit = useCallback(async (parentId: string | null = null) => {
    if (sending) return;
    if (!user) { setShowLogin(true); return; }

    const isReply = !!parentId;
    const text = isReply ? replyContent : content;
    if (!text.trim()) return alert("Komentar kosong!");

    setSending(true);

    const payload = {
      type,
      slug: compoundSlug,
      chapter: String(chapter || ""),
      content: text,
      is_spoiler: isSpoiler,
      author_name: profile?.username || user?.user_metadata?.full_name || user?.user_metadata?.name || "Member",
      user_id: user?.id || null,
      avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url || null,
      parent_id: parentId,
    };

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsSpoiler(false);
        if (isReply) {
          setReplyContent("");
          setReplying(null);
        } else {
          setContent("");
          setAuthorName("");
        }
        loadComments(true);
      }
    } catch (err) {
      console.error("Submit Error:", err);
    } finally {
      setSending(false);
    }
  }, [sending, user, profile, replyContent, content, isSpoiler, type, compoundSlug, chapter, commentMap, loadComments]);

  // ---- Memoized values ----
  const isLoggedIn = !!user;
  const canSubmit = !sending && content.trim().length > 0;

  // ---- Sticker handlers ----
  const toggleSticker = useCallback(() => setShowSticker((p) => !p), []);
  const closeSticker = useCallback(() => setShowSticker(false), []);

  // ---- Render ----
  return (
    <div className="mx-auto w-auto text-white md:mx-20">
      <RulesBox />

      {/* INPUT BOX */}
      <div className="rk-card my-6 rounded-2xl p-5">
        {!isLoggedIn && (
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Nama (opsional)"
            className="rk-input mb-3 w-full rounded-2xl p-3 text-sm"
          />
        )}

        {isLoggedIn && <UserInfo user={user} profile={profile} />}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Tulis pendapatmu tentang chapter ini..."
          className="rk-input w-full resize-none rounded-2xl p-4 text-sm"
        />

        <div className="flex justify-between mt-4 items-center">
          <div className="relative">
            <Button
              type="button"
              onClick={toggleSticker}
              className="rounded-xl px-2 py-2 text-lg"
            >
              <RiEmojiStickerLine className="text-xl" />
            </Button>
            {showSticker && (
              <StickerPicker onSelect={insertToTextarea} onClose={closeSticker} />
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              className="w-4 h-4 accent-orange-500 rounded"
            />
            <span className={`text-[10px] font-black uppercase ${isSpoiler ? "text-orange-400" : "text-gray-500"}`}>
              Spoiler?
            </span>
          </label>

          <div className="flex gap-2">
            {!isLoggedIn && (
              <button
                onClick={() => setShowLogin(true)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors duration-200"
              >
                Login
              </button>
            )}
            <button
              onClick={() => { if (!isLoggedIn) return setShowLogin(true); handleSubmit(null); }}
              disabled={sending || !canSubmit}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${
                sending || !canSubmit
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "rk-btn-primary text-white"
              }`}
            >
              {sending ? "Loading..." : "Kirim"}
            </button>
          </div>
        </div>
      </div>

      <PremiumPromoComment />

      {/* FILTER & COUNT */}
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-black">{comments.length} Komentar</h4>
        <div className="rk-card-soft flex gap-1 rounded-2xl p-1">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors duration-200 ${
                sort === key
                  ? "bg-[var(--accent)]/20 text-[var(--accent-2)]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST COMMENTS */}
      <div className="space-y-4 mb-20">
        {loading && (
          <div className="text-center py-10 text-gray-500 text-sm">
            Menyelam ke database...
          </div>
        )}
        {!loading && comments.length === 0 && (
          <div className="text-center py-10 text-gray-600 italic">
            Belum ada komentar. Jadilah yang pertama!
          </div>
        )}

        {comments.map((c) => (
          <CommentItem
            key={c.id}
            data={c}
            replying={replying}
            setReplying={setReplying}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            submitReply={handleSubmit}
            user={user}
            titleRushRank={titleRushRanks.get(c.user_id || "")}
            xpRank={xpRanks.get(c.user_id || "")}
          />
        ))}
      </div>

      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </div>
  );
}
