-- Notifikasi bell untuk hasil pengajuan Scanlator.
alter table social_notifications drop constraint if exists social_notifications_type_check;
alter table social_notifications add constraint social_notifications_type_check check (
  type = any (array[
    'new_follower','social_like','social_reply','social_mention','social_collection',
    'reply','premium_activated','premium_reward','marathon_win',
    'scanlator_approved','scanlator_rejected'
  ]::text[])
);
