import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3002';
const backend = process.env.PROJECT_API_URL || 'http://127.0.0.1:4101';
const backendHeaders = { authorization: `Bearer ${process.env.PROJECT_API_INTERNAL_TOKEN}` };
const list = await (await fetch(backend + '/projects?limit=20')).json();
assert.ok(list.data?.length);
// Pilih chapter project yang gambarnya di /chapters/ (bukan pipeline
// scanlator /scanlator/), sebab lock premium hanya berlaku di sana.
let picked = null;
for (const project of list.data) {
  const detail = await (await fetch(backend + '/projects/' + project.slug)).json();
  for (const item of detail.data.chapters) {
    const chapterPath = `/projects/${project.slug}/chapters/${item.chapter_number}`;
    const content = await (await fetch(backend + chapterPath, { headers: backendHeaders })).json();
    const urls = content.data?.image_urls || [];
    if (urls.some((url) => typeof url === "string" && url.includes("/chapters/")) && !content.data?.premium_lock_until) {
      picked = { slug: project.slug, chapter: item, chapterPath };
      break;
    }
  }
  if (picked) break;
}
assert.ok(picked, 'tidak ada chapter project dengan gambar /chapters/');
const { slug, chapter, chapterPath } = picked;
assert.ok(Object.hasOwn(chapter, 'premium_lock_until'));
assert.equal((await fetch(backend + chapterPath)).status, 401);
const content = await (await fetch(backend + chapterPath, { headers: backendHeaders })).json();
assert.ok(content.data.image_urls.length);
const reader = await fetch(base + `/api/project/chapter/${slug}/chapter-${chapter.chapter_number}`);
assert.equal(reader.status, 200); assert.match(reader.headers.get('cache-control'), /no-store/);
const payload = await reader.json();
assert.equal(payload.locked, false); assert.ok(payload.images.length);
assert.equal((await fetch(base + '/api/admin/project/chapter-lock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
assert.equal((await fetch(base + '/api/internal/chapter-access?scope=/chapters/test/1/')).status, 401);
const scope = `/chapters/${slug}/${chapter.chapter_number}/`;
const metadata = await fetch(base + '/api/internal/chapter-access?scope=' + encodeURIComponent(scope), { headers: { authorization: `Bearer ${process.env.IMAGE_ACCESS_SECRET}` } });
assert.equal(metadata.status, 200); assert.equal((await metadata.json()).premium_lock_until, null);
const session = await fetch(base + '/api/image-session', { method: 'POST', headers: { Origin: 'https://ryukomik.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ chapter: `${slug}/chapter-${chapter.chapter_number}` }) });
assert.equal(session.status, 200); assert.match(session.headers.get('set-cookie'), /v3\./);
if (process.env.CHECK_WORKER === 'true') {
  const guard = await fetch('https://storage.ryukomik.com/__ryukomik/image-guard', { headers: { authorization: `Bearer ${process.env.IMAGE_ACCESS_SECRET}` } });
  assert.equal(guard.status, 200); assert.equal((await guard.json()).premiumLockProtection, true);
  const altGuard = await fetch('https://storage.komano.my.id/__ryukomik/image-guard', { headers: { authorization: `Bearer ${process.env.IMAGE_ACCESS_SECRET}` } });
  assert.equal(altGuard.status, 200); assert.equal((await altGuard.json()).premiumLockProtection, true);
  const guardedImage = payload.images.find((url) => typeof url === 'string' && url.includes('/chapters/'));
  assert.ok(guardedImage, 'reader payload tidak punya gambar /chapters/');
  const proxy = await fetch(base + '/api/image?url=' + encodeURIComponent(guardedImage));
  assert.equal(proxy.status, 200); assert.match(proxy.headers.get('cache-control'), /no-store/); assert.ok((await proxy.arrayBuffer()).byteLength > 1024);
}
console.log('PASS: backend isolation, reader, admin authorization, metadata, image-session' + (process.env.CHECK_WORKER === 'true' ? ', deployed worker and image proxy' : ''));
