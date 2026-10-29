-- Audit aksi admin (dulu menumpang tabel activity_events Supabase).
create table if not exists activity_events (
  id bigserial primary key,
  actor_id uuid,
  actor_name text,
  event_type text not null,
  entity_id text,
  entity_label text,
  visibility text not null default 'private',
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_events_created on activity_events (created_at desc);

grant select, insert, update, delete on activity_events to ryukomik_social_app;
grant usage, select on sequence activity_events_id_seq to ryukomik_social_app;
