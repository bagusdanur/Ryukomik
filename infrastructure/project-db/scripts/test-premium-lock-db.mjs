// Integration test: creates only its own unpublished manga and cleans it up.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: process.env.PROJECT_ENV_FILE || '/home/ryukomik/ryukomik-project-db/.env', quiet: true });
const pool = new pg.Pool({ connectionString: process.env.PROJECT_DATABASE_URL });
const base = process.env.TEST_PROJECT_API_URL || 'http://127.0.0.1:4101';
const slug = 'premium-lock-test-' + randomUUID();
const actor = randomUUID();
async function mutate(ids, action = 'lock', days = 3) {
  return fetch(base + '/admin/chapter-lock', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PROJECT_API_INTERNAL_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ chapter_ids: ids, action, duration_days: days, actor_id: actor }) });
}
try {
  await pool.query('insert into project_manga(slug,title,is_published) values($1,$2,false)', [slug, 'Temporary private premium-lock test']);
  const inserted = await pool.query("insert into project_chapters(manga_slug,chapter_number,is_published,image_urls) values($1,1,true,'[\"test-only.jpg\"]'::jsonb),($1,2,false,'[]'::jsonb) returning id,is_published,uploaded_at", [slug]);
  const pub = inserted.rows.find(row => row.is_published), draft = inserted.rows.find(row => !row.is_published);
  assert.equal((await mutate([pub.id, draft.id])).status, 400);
  assert.equal((await pool.query('select premium_lock_until from project_chapters where id=$1', [pub.id])).rows[0].premium_lock_until, null);
  assert.equal((await mutate([pub.id, randomUUID()])).status, 400);
  assert.equal((await mutate([pub.id, pub.id])).status, 400);
  const lockedResponse = await mutate([pub.id]); assert.equal(lockedResponse.status, 200);
  const locked = (await lockedResponse.json()).data[0];
  assert.equal(Date.parse(locked.premium_lock_until) - Date.parse(locked.premium_lock_started_at), 3 * 86400000);
  const changed = await pool.query('select uploaded_at,premium_lock_until from project_chapters where id=$1', [pub.id]);
  assert.equal(changed.rows[0].uploaded_at.toISOString(), pub.uploaded_at.toISOString());
  assert.equal((await mutate([pub.id], 'lock', 7)).status, 200);
  const audit = await pool.query('select detail from project_activity_log where manga_slug=$1 order by created_at desc limit 1', [slug]);
  assert.equal(audit.rows[0].detail.actor_id, actor); assert.equal(audit.rows[0].detail.duration_days, 7); assert.ok(audit.rows[0].detail.before.until);
  assert.equal((await mutate([pub.id], 'unlock')).status, 200);
  assert.equal((await pool.query('select premium_lock_until from project_chapters where id=$1', [pub.id])).rows[0].premium_lock_until, null);
  console.log('PASS PostgreSQL: atomic rejection, selected-chapter lock, server duration, unchanged upload timestamp, audit, duration reset, unlock');
} finally {
  await pool.query('delete from project_activity_log where manga_slug=$1', [slug]);
  await pool.query('delete from project_manga where slug=$1', [slug]);
  await pool.end();
  console.log('Temporary private test manga/chapters and test audit entries cleaned up.');
}
