-- Indexes for high-traffic Supabase reads.
-- These do not change schemas or RLS. They reduce scanned rows for common
-- filtered/count/order queries, which helps keep hot public pages cheaper.

create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);

create index if not exists idx_comments_thread_created_at
  on public.comments (type, slug, chapter, created_at desc);

create index if not exists idx_comments_parent_created_at
  on public.comments (parent_id, created_at desc);

create index if not exists idx_user_reads_user_chapter_created_at
  on public.user_reads (user_id, chapter_slug, created_at desc);

create index if not exists idx_user_reads_created_at
  on public.user_reads (created_at desc);

create index if not exists idx_profiles_xp
  on public.profiles (xp desc);

create index if not exists idx_premium_requests_status_created_at
  on public.premium_requests (status, created_at desc);

create index if not exists idx_premium_codes_created_at
  on public.premium_codes (created_at desc);

create index if not exists idx_user_collections_user_updated_at
  on public.user_collections (user_id, updated_at desc);

create index if not exists idx_user_collection_items_collection_position_created_at
  on public.user_collection_items (collection_id, position, created_at desc);
