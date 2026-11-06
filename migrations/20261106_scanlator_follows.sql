-- Fase 8: pembaca bisa mengikuti grup Scanlator.
create table if not exists scanlator_follows (
  user_id uuid not null references auth_users(id) on delete cascade,
  handle text not null,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, handle)
);

create index if not exists scanlator_follows_handle_idx on scanlator_follows (handle);
