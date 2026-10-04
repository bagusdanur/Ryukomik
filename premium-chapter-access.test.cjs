const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path, stubs = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module); const originalRequire = mod.require.bind(mod); mod.require = id => Object.hasOwn(stubs, id) ? stubs[id] : originalRequire(id); mod._compile(compiled, path); return mod.exports;
}
const { evaluateChapterAccess, parseProjectImageScope } = loadTs('src/lib/chapterAccessPolicy.ts');
const { validateLockInput, changeChapterLocks } = loadTs('infrastructure/project-db/src/chapterLocks.ts');
const now = Date.parse('2026-10-04T00:00:00Z');
const lock = { premium_lock_started_at: new Date(now - 1000).toISOString(), premium_lock_until: new Date(now + 86400000).toISOString() };

test('visitor and regular/expired premium cannot access a locked chapter', () => {
  for (const profile of [null, { is_premium: false }, { is_premium: true, premium_until: new Date(now).toISOString() }]) assert.equal(evaluateChapterAccess(lock, profile, now).allowed, false);
});
test('active and lifetime premium can access; sessions never exceed premium or lock expiry', () => {
  const short = evaluateChapterAccess(lock, { is_premium: true, premium_until: new Date(now + 60000).toISOString() }, now);
  assert.equal(short.allowed, true); assert.equal(short.expires, (now + 60000) / 1000);
  assert.equal(evaluateChapterAccess(lock, { is_premium: true }, now).allowed, true);
  assert.equal(evaluateChapterAccess({ ...lock, premium_lock_until: new Date(now + 10000).toISOString() }, { is_premium: true }, now).expires, (now + 10000) / 1000);
});
test('unlocked and exactly expired chapters are public; corrupt lock metadata fails closed', () => {
  assert.equal(evaluateChapterAccess({}, null, now).allowed, true);
  assert.equal(evaluateChapterAccess({ ...lock, premium_lock_until: new Date(now).toISOString() }, null, now).allowed, true);
  assert.throws(() => evaluateChapterAccess({ premium_lock_until: 'bad date' }, null, now));
  assert.throws(() => evaluateChapterAccess({ premium_lock_until: lock.premium_lock_until }, null, now));
});
test('only Project storage URLs resolve chapter scopes', () => {
  assert.equal(parseProjectImageScope('https://storage.ryukomik.my.id/chapters/test/1.5/001.jpg').scope, '/chapters/test/1.5/');
  assert.equal(parseProjectImageScope('https://storage.ryukomik.my.id.evil/chapters/test/1/001.jpg'), null);
});

const id = '11111111-1111-4111-8111-111111111111', actor = '22222222-2222-4222-8222-222222222222';
test('batch input rejects invalid, duplicate, over-limit IDs and fractional durations', () => {
  const base = { chapter_ids: [id], action: 'lock', duration_days: 3, actor_id: actor };
  assert.equal(validateLockInput(base).days, 3);
  for (const extra of [{ chapter_ids: [] }, { chapter_ids: [id, id] }, { chapter_ids: ['bad'] }, { duration_days: 0 }, { duration_days: 366 }, { duration_days: 1.5 }, { actor_id: 'bad' }, { action: 'publish' }]) assert.throws(() => validateLockInput({ ...base, ...extra }));
});

function poolFixture(rows, failAudit = false) {
  const calls = []; let released = false;
  const client = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('select')) return { rows };
    if (sql.startsWith('update')) return { rows: rows.map(row => ({ ...row, premium_lock_started_at: 'start', premium_lock_until: 'end' })) };
    if (failAudit && sql.startsWith('insert')) throw new Error('audit failed');
    return { rows: [] };
  }, release: () => { released = true; } };
  return { pool: { connect: async () => client }, calls, released: () => released };
}
test('missing IDs or draft in selection roll back before update', async () => {
  for (const rows of [[], [{ id, is_published: false }]]) {
    const f = poolFixture(rows);
    await assert.rejects(changeChapterLocks(f.pool, { chapter_ids: [id], action: 'lock', duration_days: 3, actor_id: actor }));
    assert.equal(f.calls.some(c => c.sql.startsWith('update')), false);
    assert.equal(f.calls.at(-1).sql, 'rollback'); assert.equal(f.released(), true);
  }
});
test('batch locks write actor/before/after audit inside transaction without altering upload timestamp', async () => {
  const f = poolFixture([{ id, manga_slug: 'test', chapter_number: 1, is_published: true, premium_lock_until: null }]);
  await changeChapterLocks(f.pool, { chapter_ids: [id], action: 'lock', duration_days: 7, actor_id: actor });
  const update = f.calls.find(c => c.sql.startsWith('update'));
  assert.equal(update.sql.includes('uploaded_at'), false); assert.deepEqual(update.values, [[id], true, 7]);
  const audit = f.calls.find(c => c.sql.startsWith('insert'));
  assert.equal(JSON.parse(audit.values[3]).actor_id, actor); assert.equal(f.calls.at(-1).sql, 'commit');
});
test('audit failures roll back lock updates; unlock clears dates', async () => {
  const rows = [{ id, manga_slug: 'test', chapter_number: 1, is_published: true }];
  const failed = poolFixture(rows, true);
  await assert.rejects(changeChapterLocks(failed.pool, { chapter_ids: [id], action: 'lock', duration_days: 3, actor_id: actor }));
  assert.equal(failed.calls.at(-1).sql, 'rollback');
  const ok = poolFixture(rows); await changeChapterLocks(ok.pool, { chapter_ids: [id], action: 'unlock', actor_id: actor });
  assert.deepEqual(ok.calls.find(c => c.sql.startsWith('update')).values, [[id], false, null]);
});

test('reader route returns metadata without image URLs for visitor, regular and expired accounts', async () => {
  const chapter = { ...lock, chapter_number: 1, image_urls: ['https://storage.ryukomik.my.id/chapters/test/1/secret.jpg'] };
  const profiles = { regular: { is_premium: false }, expired: { is_premium: true, premium_until: new Date(now).toISOString() }, premium: { is_premium: true } };
  const route = loadTs('src/app/api/project/chapter/[slug]/[chapter]/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/projectApiServer': { projectApiFetch: async () => ({ data: chapter }) },
    '@/lib/chapterAccess': { bearerToken: req => req.headers.get('authorization') || '', getChapterAccess: async (_slug, _chapter, token) => evaluateChapterAccess(chapter, profiles[token] || null, now) },
  });
  for (const token of ['', 'regular', 'expired', 'premium']) {
    const response = await route.GET(new Request('https://test/api', { headers: { authorization: token } }), { params: Promise.resolve({ slug: 'test', chapter: 'chapter-1' }) });
    const data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.locked, token !== 'premium');
    assert.deepEqual(data.images, token === 'premium' ? chapter.image_urls : []); assert.match(response.headers.get('cache-control'), /private, no-store/);
  }
});

test('missing backend metadata fails closed; proxy never returns 304 before premium authorization', async () => {
  const route = loadTs('src/app/api/project/chapter/[slug]/[chapter]/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/projectApiServer': { projectApiFetch: async () => ({ data: { image_urls: ['secret'] } }) }, '@/lib/chapterAccess': {} });
  assert.equal((await route.GET(new Request('https://test/api'), { params: Promise.resolve({ slug: 'test', chapter: 'chapter-1' }) })).status, 503);
  const image = loadTs('src/app/api/image/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/chapterAccess': { bearerToken: () => '', getChapterAccess: async () => ({ allowed: false }) },
    '@/lib/chapterAccessPolicy': { parseProjectImageScope }, '@/lib/imageAccessCookie': {},
  });
  const response = await image.GET(new Request('https://test/api/image?url=' + encodeURIComponent('https://storage.ryukomik.my.id/chapters/test/1/secret.jpg'), { headers: { 'if-none-match': 'anything' } }));
  assert.equal(response.status, 401); assert.match(response.headers.get('cache-control'), /no-store/);
});

test('simultaneous image access shares one premium query, and activation invalidates it', async () => {
  let queries = 0, premium = false; const cache = new Map();
  const access = loadTs('src/lib/chapterAccess.ts', {
    'server-only': {}, './chapterAccessPolicy': { evaluateChapterAccess },
    'next/cache': { revalidateTag: () => cache.clear(), unstable_cache: (loader, key) => async () => { const k = JSON.stringify(key); if (cache.has(k)) return cache.get(k); const value = await loader(); cache.set(k, value); return value; } },
    '@/lib/serverRoleCache': { getVerifiedUserId: async () => id },
    '@/lib/projectApiServer': {},
    '@/lib/supabaseServer': { supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { queries++; await new Promise(resolve => setTimeout(resolve, 5)); return { data: { is_premium: premium } }; } }) }) }) } },
  });
  const values = await Promise.all(Array.from({ length: 20 }, () => access.getPremiumAccess('verified-token')));
  assert.equal(queries, 1); assert.equal(values[0].is_premium, false);
  premium = true; access.invalidatePremiumAccess(id);
  assert.equal((await access.getPremiumAccess('verified-token')).is_premium, true); assert.equal(queries, 2);
});
