-- Mempertahankan target balasan langsung di komentar (bukan hanya root),
-- supaya UI bisa merender "Membalas @nama" ala IG walau balasan bisa 2 tingkat.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to_id bigint;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to_name text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to_user_id text;

CREATE INDEX IF NOT EXISTS idx_comments_reply_to_id ON comments (reply_to_id);

-- Backfill baris lama: parent_id masih root; untuk thread 1 tingkat ini sudah benar.
UPDATE comments child
SET reply_to_id = child.parent_id,
    reply_to_name = parent.author_name,
    reply_to_user_id = parent.user_id
FROM comments parent
WHERE child.parent_id IS NOT NULL
  AND child.reply_to_id IS NULL
  AND parent.id = child.parent_id;
