const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path, stubs = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module); const originalRequire = mod.require.bind(mod); mod.require = id => Object.hasOwn(stubs, id) ? stubs[id] : originalRequire(id); mod._compile(compiled, path); return mod.exports;
}

const p = loadTs('src/lib/requestAuthPolicy.ts');

test('acting user comes ONLY from the verified token, never from the request body', () => {
  assert.equal(p.resolveActorUserId('user-token-id'), 'user-token-id');
  assert.equal(p.resolveActorUserId(null), null);
  assert.equal(p.resolveActorUserId(undefined), null);
  assert.equal(p.resolveActorUserId(''), null);
  // A body-supplied id can never win: the helper has no body parameter at all.
  assert.equal(p.resolveActorUserId.length, 1);
});

test('admin premium days are clamped to a safe range', () => {
  assert.equal(p.normalizePremiumDays(30), 30);
  assert.equal(p.normalizePremiumDays(0), 30);
  assert.equal(p.normalizePremiumDays(-5), 30);
  assert.equal(p.normalizePremiumDays('abc'), 30);
  assert.equal(p.normalizePremiumDays(99999), 3650);
  assert.equal(p.normalizePremiumDays('7'), 7);
});

test('premium extension stacks on an active subscription and starts fresh when expired', () => {
  const now = Date.parse('2026-10-23T00:00:00Z');
  // active until +10 days -> adds 30 days on top of that
  const active = p.computePremiumUntil('2026-11-02T00:00:00Z', 30, now);
  assert.equal(active, new Date(Date.parse('2026-11-02T00:00:00Z') + 30 * 86400000).toISOString());
  // expired -> starts from now
  const expired = p.computePremiumUntil('2026-01-01T00:00:00Z', 30, now);
  assert.equal(expired, new Date(now + 30 * 86400000).toISOString());
  // null -> starts from now
  const none = p.computePremiumUntil(null, 7, now);
  assert.equal(none, new Date(now + 7 * 86400000).toISOString());
});

test('upload endpoint must be admin-gated (guards the unauthenticated upload regression)', () => {
  const src = fs.readFileSync('src/app/api/admin/project/upload-image/route.ts', 'utf8');
  assert.ok(src.includes('verifyAdminRequest'), 'upload-image must verify an admin token');
  assert.ok(!/startsWith\("Bearer "\)\s*\)\s*\{\s*return NextResponse\.json\(\{ error: "Unauthorized" \}/.test(src), 'must not accept any Bearer prefix as auth');
});

test('comment and reaction writers must not trust a body-supplied user id', () => {
  for (const f of ['src/app/api/comments/route.ts', 'src/app/api/reactions/route.ts']) {
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(src.includes('requireUserId'), `${f} must verify the bearer token`);
  }
});

test('a self-promoted admin row is rejected unless the id is allowlisted', () => {
  const allow = p.parseAdminAllowlist('id-legit-1, id-legit-2');
  assert.ok(allow && allow.size === 2);
  assert.equal(p.isAdminAllowed('admin', 'id-legit-1', allow), true);
  assert.equal(p.isAdminAllowed('admin', 'id-attacker', allow), false);
  assert.equal(p.isAdminAllowed('user', 'id-legit-1', allow), false);
  assert.equal(p.isAdminAllowed(null, 'id-legit-1', allow), false);
  // Unset/empty allowlist keeps legacy behaviour (role alone decides).
  assert.equal(p.parseAdminAllowlist(''), null);
  assert.equal(p.parseAdminAllowlist(undefined), null);
  assert.equal(p.isAdminAllowed('admin', 'anyone', null), true);
});
