-- Sosial timeline: simpan target balasan langsung di social_posts.
-- reply_to_id menunjuk postingan yang tepat dibalas (bisa induk atau balasan lain),
-- sehingga UI bisa menampilkan "Membalas @username" ala IG.
alter table social_posts
  add column if not exists reply_to_id uuid references social_posts(id) on delete set null;

-- Balasan lama yang belum punya target: asumsikan membalas postingan induknya.
update social_posts
set reply_to_id = parent_id
where parent_id is not null and reply_to_id is null;

create index if not exists idx_social_posts_reply_to on social_posts(reply_to_id);
