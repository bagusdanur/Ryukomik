import { supabaseAdmin } from "@/lib/supabaseServer";

export type ProjectDiscordEventType =
  | "project_published"
  | "chapter_published"
  | "project_status_changed";

type MangaSnapshot = {
  slug: string;
  title: string;
  cover_url?: string | null;
  type?: string | null;
  status?: string | null;
  genres?: string[] | null;
};

export async function enqueueProjectDiscordEvent(
  eventType: ProjectDiscordEventType,
  manga: MangaSnapshot,
  extra: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin.from("project_discord_events").insert({
    event_type: eventType,
    manga_slug: manga.slug,
    payload: {
      slug: manga.slug,
      title: manga.title,
      cover_url: manga.cover_url || "",
      type: manga.type || "",
      status: manga.status || "",
      genres: manga.genres || [],
      ...extra,
    },
  });
  if (error) throw error;
}
