export interface Series {
  id?: string;
  title: string;
  slug?: string;
  source?: string;
  thumbnail?: string;
  image?: string;
  cover_url?: string;
  synopsis?: string;
  description?: string;
  status?: string;
  type?: string;
  genres?: string[];
  rating?: number;
  chapters?: Chapter[];
  created_at?: string;
  updated_at?: string;
  upvote_count?: number;
}

export interface Chapter {
  id?: string;
  series_id?: string;
  title?: string;
  slug?: string;
  chapter_number?: number;
  chapter?: string;
  url?: string;
  images?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Genre {
  id?: string;
  name: string;
  slug: string;
}

export interface ReaderChapter {
  title?: string;
  mangaId?: string;
  currentChapter?: string;
  images: string[];
  prev?: string;
  next?: string;
}

import type { SourceId as ImportedSourceId } from "@/config/sources";
export type SourceId = ImportedSourceId;

export interface UpdateItem {
  slug: string;
  title: string;
  image?: string;
  info?: string;
  type_genre?: string;
  chapter_terbaru?: string;
  status?: string;
  source?: SourceId;
  upvote_count?: number;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface TerbaruFilters {
  tipe?: FilterOption[];
  status?: FilterOption[];
  genre?: FilterOption[];
  genre2?: FilterOption[];
}

export interface NotificationItem {
  id: string;
  user_id?: string;
  actor_name?: string;
  type?: string;
  slug?: string;
  target_id?: string | null;
  is_read?: boolean;
  created_at: string;
}

export interface SearchResultItem {
  slug: string;
  title?: string;
  image?: string;
  info?: string;
  update?: string;
  latest_chapter?: string;
  chapter_terbaru?: string;
  detail_link?: string;
  link?: string;
  source: SourceId;
  sourceLabel: string;
}

export interface ListKomikItem {
  title: string;
  image?: string;
  link: string;
  status?: string;
}
