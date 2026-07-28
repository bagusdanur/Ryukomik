-- Small outbox records for the Discord bot.  No image blobs are stored here.
create table if not exists public.project_discord_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('project_published', 'chapter_published', 'project_status_changed')),
  manga_slug text not null references public.project_manga(slug) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_discord_events_id
  on public.project_discord_events (id);

alter table public.project_discord_events enable row level security;
-- The table is intentionally service-role only. Events are exposed to the bot
-- through a token-protected server route, never through the public Supabase API.
