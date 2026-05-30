export interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  is_premium?: boolean;
  premium_until?: string | null;
  is_admin?: boolean;
  xp?: number;
  created_at?: string;
}

export interface BookmarkItem {
  slug: string;
  source?: string;
  title: string;
  image?: string;
  updatedAt?: number;
}

export interface ReadHistoryItem {
  comicSlug: string;
  lastChapterSlug: string;
  lastChapter?: string;
  title?: string;
  source?: string;
  updatedAt: number;
}
