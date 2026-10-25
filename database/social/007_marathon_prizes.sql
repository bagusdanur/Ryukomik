-- Hadiah dipisah per periode: mingguan lebih kecil, bulanan lebih besar.
-- Array 3 elemen: [juara 1, juara 2, juara 3] dalam hari premium.

alter table marathon_events
  add column if not exists weekly_days int[] not null default '{30,14,7}',
  add column if not exists monthly_days int[] not null default '{60,30,14}';

-- Event lama: pakai konfigurasi premium_days_1..3 yang sudah ada sebagai hadiah mingguan.
update marathon_events
   set weekly_days = array[premium_days_1, premium_days_2, premium_days_3]
 where weekly_days is null;

create index if not exists marathon_winners_user_idx
  on marathon_winners (user_id, created_at desc);

-- Notifikasi pemenang Speedrun: daftarkan tipe barunya.
alter table social_notifications
  drop constraint if exists social_notifications_type_check;

alter table social_notifications
  add constraint social_notifications_type_check
  check (type in (
    'new_follower', 'social_like', 'social_reply', 'social_mention',
    'social_collection', 'reply', 'premium_activated', 'premium_reward',
    'marathon_win'
  ));
