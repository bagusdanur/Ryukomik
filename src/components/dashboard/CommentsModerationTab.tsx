"use client";

import Link from "next/link";
import {
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { Avatar, getContentLink, PER_PAGE, timeAgo } from "./dashboardUtils";

type ModeratedComment = {
  id: string;
  slug?: string | null;
  chapter?: string | number | null;
  author_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  is_spoiler?: boolean;
  content?: string | null;
};

type CommentsModerationTabProps = {
  comments: ModeratedComment[];
  commentsLoading: boolean;
  commentFilter: string;
  commentSearch: string;
  commentPage: number;
  commentTotal: number;
  deleteLoading?: string | null;
  fetchComments: () => void;
  setCommentFilter: (filter: string) => void;
  setCommentSearch: (search: string) => void;
  setCommentPage: (page: number | ((page: number) => number)) => void;
  deleteComment: (id: string) => void;
};

export default function CommentsModerationTab({
  comments,
  commentsLoading,
  commentFilter,
  commentSearch,
  commentPage,
  commentTotal,
  deleteLoading,
  fetchComments,
  setCommentFilter,
  setCommentSearch,
  setCommentPage,
  deleteComment,
}: CommentsModerationTabProps) {
  const totalPages = Math.max(1, Math.ceil(commentTotal / PER_PAGE));

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold text-white">Moderasi Komentar</p>
          <p className="text-[11px] text-white/30">
            {commentTotal.toLocaleString("id-ID")} komentar ditemukan
          </p>
        </div>
        <button
          onClick={fetchComments}
          disabled={commentsLoading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.05] text-white/40 transition-colors hover:text-white"
        >
          <FiRefreshCw
            size={13}
            className={commentsLoading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="relative">
        <FiSearch
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          type="text"
          value={commentSearch}
          onChange={(event) => {
            setCommentSearch(event.target.value);
            setCommentPage(1);
          }}
          placeholder="Cari isi komentar..."
          className="rk-input w-full rounded-xl py-2.5 pl-9 pr-4 text-[13px] placeholder-white/25"
        />
      </div>

      <div className="flex gap-2">
        {[
          { key: "all", label: "Semua" },
          { key: "spoiler", label: "Spoiler" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setCommentFilter(filter.key);
              setCommentPage(1);
            }}
            className={`flex-1 rounded-xl border py-2 text-[11px] font-semibold transition-all ${
              commentFilter === filter.key
                ? "border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:color-mix(in_srgb,var(--accent)_70%,white)]"
                : "border-white/[.08] bg-transparent text-white/35 hover:text-white/60"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {commentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : comments.length === 0 ? (
        <div className="rk-card-soft rounded-2xl border-dashed py-12 text-center">
          <FiMessageCircle size={28} className="mx-auto mb-2 text-white/10" />
          <p className="text-[13px] text-white/25">
            Tidak ada komentar ditemukan.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => {
            const contentLink = getContentLink(comment.slug);

            return (
              <div
                key={comment.id}
                className={`rk-card-soft space-y-2 rounded-xl px-3 py-3 ${
                  comment.is_spoiler
                    ? "border-[color:color-mix(in_srgb,var(--accent-3)_20%,transparent)]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={comment.author_name}
                      url={comment.avatar_url}
                      size={30}
                    />
                    <div>
                      <p className="text-[12px] font-semibold leading-tight text-white/80">
                        {comment.author_name ?? "Anonim"}
                      </p>
                      <p className="text-[10px] text-white/25">
                        {timeAgo(comment.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {comment.is_spoiler && (
                      <span className="rounded-full bg-[color:color-mix(in_srgb,var(--accent-3)_10%,transparent)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent-3)]">
                        SPOILER
                      </span>
                    )}
                    {contentLink && (
                      <Link
                        href={contentLink}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.05] text-white/35 transition-colors hover:text-[var(--accent-2)]"
                        title="Buka lokasi komentar"
                      >
                        <FiExternalLink size={12} />
                      </Link>
                    )}
                    <button
                      onClick={() => deleteComment(comment.id)}
                      disabled={deleteLoading === comment.id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--accent-3)_10%,transparent)] text-[color:color-mix(in_srgb,var(--accent-3)_70%,transparent)] transition-colors hover:text-[var(--accent-3)] disabled:opacity-40"
                    >
                      {deleteLoading === comment.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent-3)] border-t-transparent" />
                      ) : (
                        <FiTrash2 size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <p className="line-clamp-3 pl-[38px] text-[12px] leading-relaxed text-white/60">
                  {comment.content}
                </p>

                {(comment.slug || comment.chapter) && (
                  <div className="flex items-center gap-1.5 pl-[38px]">
                    <FiBookOpen size={10} className="text-white/20" />
                    <p className="truncate text-[10px] text-white/25">
                      {comment.slug ?? ""}
                      {comment.chapter ? ` - Ch. ${comment.chapter}` : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!commentsLoading && comments.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setCommentPage((page) => Math.max(1, page - 1))}
            disabled={commentPage <= 1}
            className="flex items-center gap-1 rounded-xl border border-white/[.08] bg-[var(--surface-1)] px-3 py-2 text-[12px] text-white/50 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
          >
            <FiChevronLeft size={13} /> Prev
          </button>
          <span className="text-[11px] text-white/30">
            Hal {commentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCommentPage((page) => Math.min(totalPages, page + 1))}
            disabled={commentPage >= totalPages}
            className="flex items-center gap-1 rounded-xl border border-white/[.08] bg-[var(--surface-1)] px-3 py-2 text-[12px] text-white/50 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
          >
            Next <FiChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
