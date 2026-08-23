import "dotenv/config";
import pg from "pg";

const databaseUrl = process.env.SOCIAL_DATABASE_URL;
if (!databaseUrl) throw new Error("SOCIAL_DATABASE_URL is required");

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
try {
  const posts = await pool.query(`update social_posts post set
    likes_count=(select count(*)::int from social_post_likes item where item.post_id=post.id),
    replies_count=(select count(*)::int from social_posts reply where reply.parent_id=post.id)
    where post.likes_count is distinct from (select count(*)::int from social_post_likes item where item.post_id=post.id)
       or post.replies_count is distinct from (select count(*)::int from social_posts reply where reply.parent_id=post.id)`);
  const collections = await pool.query(`update social_collections collection set
    items_count=(select count(*)::int from social_collection_items item where item.collection_id=collection.id)
    where collection.items_count is distinct from (select count(*)::int from social_collection_items item where item.collection_id=collection.id)`);
  console.log(`Repaired ${posts.rowCount} post counters and ${collections.rowCount} collection counters.`);
} finally {
  await pool.end();
}
