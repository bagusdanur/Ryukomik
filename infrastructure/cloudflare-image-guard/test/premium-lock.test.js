import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { verifyImageCookie, cookieAllowsLock } from '../src/policy.js';

const secret = 'test-only-secret-with-at-least-32-characters';
const scope = '/chapters/test/1/';
const now = Math.floor(Date.now() / 1000);
const started = (now - 60) * 1000;
const lock = { premium_lock_started_at: new Date(started).toISOString(), premium_lock_until: new Date((now + 3600) * 1000).toISOString() };
function cookie(grant, version = String(started), expires = now + 1000, chapterScope = scope) {
  const payload = `v3.${expires}.abcdefghijklmnop.${Buffer.from(chapterScope).toString('base64url')}.${grant}.${version}`;
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
function request(value, path = scope + '001.jpg') { return new Request('https://storage.ryukomik.my.id' + path, { headers: { cookie: `ryu_image_access=${value}`, referer: 'https://ryukomik.my.id/' } }); }

test('public old cookie cannot unlock premium; premium grant is bound to lock version', async () => {
  assert.equal(cookieAllowsLock(await verifyImageCookie(request(cookie('public')), secret), lock), false);
  assert.equal(cookieAllowsLock(await verifyImageCookie(request(cookie('premium')), secret), lock), true);
  assert.equal(cookieAllowsLock(await verifyImageCookie(request(cookie('premium', '0')), secret), lock), false);
  assert.equal(cookieAllowsLock(await verifyImageCookie(request(cookie('preview')), secret), lock), true);
});
test('tampered, expired and other-chapter cookies are rejected', async () => {
  assert.equal(await verifyImageCookie(request(cookie('premium') + 'x'), secret), false);
  assert.equal(await verifyImageCookie(request(cookie('premium', String(started), now)), secret), false);
  assert.equal(await verifyImageCookie(request(cookie('premium'), '/chapters/test/2/001.jpg'), secret), false);
});
test('worker denies old public cookie even when anti-hotlink is disabled; premium gets no-store images', async () => {
  const source = (await readFile(new URL('../src/index.js', import.meta.url), 'utf8')).replace('import promoImage from "../assets/hotlink-promo.png";', 'const promoImage = new Uint8Array([1]);').replace('from "./policy.js"', `from ${JSON.stringify(new URL('../src/policy.js', import.meta.url).href)}`);
  const worker = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
  const previous = globalThis.fetch; let reads = 0;
  globalThis.fetch = async () => Response.json(lock);
  const env = { IMAGE_ACCESS_SECRET: secret, REQUIRE_SIGNED_COOKIE: 'true', HOTLINK_CONFIG: { get: async () => 'false' }, COMICS: { get: async () => { reads++; return { body: new Uint8Array(2048), size: 2048, httpEtag: 'test', writeHttpMetadata: h => h.set('content-type', 'image/jpeg') }; } } };
  try {
    assert.equal((await worker.fetch(request(cookie('public')), env)).status, 403); assert.equal(reads, 0);
    const allowed = await worker.fetch(request(cookie('premium')), env);
    assert.equal(allowed.status, 200); assert.match(allowed.headers.get('cache-control'), /no-store/); assert.equal(reads, 1);
    globalThis.fetch = async () => new Response('down', { status: 503 });
    assert.equal((await worker.fetch(request(cookie('public', '0', now + 1000, '/chapters/test/2/'), '/chapters/test/2/001.jpg'), env)).status, 503);
  } finally { globalThis.fetch = previous; }
});
