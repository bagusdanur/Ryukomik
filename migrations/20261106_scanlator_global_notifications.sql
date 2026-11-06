-- Semua aktivitas Scanlator tampil di lonceng notifikasi global.
alter table social_notifications
  drop constraint if exists social_notifications_type_check;

alter table social_notifications
  add constraint social_notifications_type_check check (
    type = any (array[
      'new_chapter'::text,
      'comment_reply'::text,
      'reply'::text,
      'new_follower'::text,
      'title_rush_weekly'::text,
      'social_like'::text,
      'social_reply'::text,
      'social_mention'::text,
      'social_collection'::text,
      'premium_activated'::text,
      'premium_reward'::text,
      'marathon_win'::text,
      'scanlator_approved'::text,
      'scanlator_rejected'::text,
      'scanlator_update'::text
    ])
  );
