import type pg from 'pg';

export class LockInputError extends Error { status = 400; }

export function validateLockInput(body: unknown) {
  const b = body as { chapter_ids?: unknown; action?: unknown; duration_days?: unknown; actor_id?: unknown } | null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!b || !Array.isArray(b.chapter_ids) || !b.chapter_ids.length || b.chapter_ids.length > 100 || b.chapter_ids.some(id => typeof id !== 'string' || !uuid.test(id))) throw new LockInputError('Pilih 1–100 chapter dengan ID valid.');
  if (new Set(b.chapter_ids).size !== b.chapter_ids.length) throw new LockInputError('ID chapter harus unik.');
  if (b.action !== 'lock' && b.action !== 'unlock') throw new LockInputError('Aksi lock tidak valid.');
  if (b.action === 'lock' && (!Number.isInteger(b.duration_days) || Number(b.duration_days) < 1 || Number(b.duration_days) > 365)) throw new LockInputError('Durasi harus 1–365 hari.');
  if (typeof b.actor_id !== 'string' || !uuid.test(b.actor_id)) throw new LockInputError('Identitas admin tidak valid.');
  return { chapterIds: b.chapter_ids as string[], action: b.action, days: b.action === 'lock' ? Number(b.duration_days) : null, actorId: b.actor_id };
}

export async function changeChapterLocks(pool: Pick<pg.Pool, 'connect'>, body: unknown) {
  const input = validateLockInput(body);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await client.query('select id,manga_slug,chapter_number,is_published,premium_lock_started_at,premium_lock_until from project_chapters where id=any($1::uuid[]) order by id for update', [input.chapterIds]);
    if (before.rows.length !== input.chapterIds.length) throw new LockInputError('Salah satu chapter tidak ditemukan. Tidak ada perubahan disimpan.');
    if (input.action === 'lock' && before.rows.some(row => !row.is_published)) throw new LockInputError('Publikasikan semua chapter terpilih sebelum mengunci.');
    const after = await client.query(
      'update project_chapters set premium_lock_started_at=case when $2 then now() else null end,premium_lock_until=case when $2 then now()+($3::int * interval \'1 day\') else null end where id=any($1::uuid[]) returning id,manga_slug,chapter_number,premium_lock_started_at,premium_lock_until',
      [input.chapterIds, input.action === 'lock', input.days],
    );
    for (const row of after.rows) {
      const old = before.rows.find(item => item.id === row.id);
      await client.query('insert into project_activity_log(action,entity_type,entity_id,manga_slug,detail) values($1,\'chapter\',$2,$3,$4)', [
        input.action === 'lock' ? 'premium_lock' : 'premium_unlock', row.id, row.manga_slug,
        JSON.stringify({ actor_id: input.actorId, chapter_number: row.chapter_number, duration_days: input.days, before: { started_at: old.premium_lock_started_at, until: old.premium_lock_until }, after: { started_at: row.premium_lock_started_at, until: row.premium_lock_until } }),
      ]);
    }
    await client.query('commit');
    return after.rows;
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
