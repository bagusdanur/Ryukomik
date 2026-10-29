-- app_settings (ads, apk, title rush) pindah ke Postgres lokal.
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on app_settings to ryukomik_social_app;
