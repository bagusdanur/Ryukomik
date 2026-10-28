-- Menyimpan siapa pemegang frame juara maraton dan border aslinya,
-- supaya bisa dikembalikan saat user keluar dari 3 besar.

create table if not exists marathon_frame_assignments (
  user_id uuid primary key,
  border_id text not null,
  prev_border text,
  period_key text not null,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on marathon_frame_assignments to ryukomik_social_app;
