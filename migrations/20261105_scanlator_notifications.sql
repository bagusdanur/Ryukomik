-- Notifikasi in-app untuk Scanlator (status project, sanksi, dll).
create table if not exists scanlator_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  type text not null,            -- project_approved | project_rejected | warn | suspend | revoke | restore | info
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_scanlator_notif_user on scanlator_notifications(user_id, created_at desc);
create index if not exists idx_scanlator_notif_unread on scanlator_notifications(user_id) where read_at is null;
