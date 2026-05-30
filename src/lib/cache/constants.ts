export const CACHE_TTL = {
  instant: 0,
  search: 300,
  publicShort: 600,
  publicMedium: 3600,
  publicLong: 86400,
  chapter: 604800,
} as const;

export const PRIVATE_PATH_PREFIXES = [
  "/dashboard",
  "/setting",
  "/files",
  "/bookmark",
  "/history",
  "/premium",
  "/auth",
  "/u",
] as const;

export const PRIVATE_API_PREFIXES = [
  "/api/comments",
  "/api/comment-like",
  "/api/reactions",
  "/api/xp",
] as const;
