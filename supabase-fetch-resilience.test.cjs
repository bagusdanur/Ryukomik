const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path, stubs = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module); const originalRequire = mod.require.bind(mod); mod.require = id => Object.hasOwn(stubs, id) ? stubs[id] : originalRequire(id); mod._compile(compiled, path); return mod.exports;
}

const m = loadTs('src/lib/supabase/fetchResilient.ts');

test('only idempotent methods are retried after a timeout', () => {
  for (const ok of ['GET', 'get', 'HEAD', undefined, null]) assert.equal(m.shouldRetryFetch(ok), true, String(ok));
  for (const no of ['POST', 'PATCH', 'PUT', 'DELETE']) assert.equal(m.shouldRetryFetch(no), false, no);
});

test('request method resolution prefers init.method then the Request object', () => {
  assert.equal(m.resolveRequestMethod('https://x.test/a'), 'GET');
  assert.equal(m.resolveRequestMethod('https://x.test/a', { method: 'post' }), 'POST');
  const req = new Request('https://x.test/a', { method: 'PATCH' });
  assert.equal(m.resolveRequestMethod(req), 'PATCH');
  assert.equal(m.resolveRequestMethod(req, { method: 'DELETE' }), 'DELETE');
});

test('a GET retries once on failure; a POST does not', async () => {
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error('stale socket');
    return new Response('ok');
  };
  const f = m.createResilientFetch(flaky, 50);
  const res = await f('https://x.test/a');
  assert.equal(calls, 2);
  assert.equal(await res.text(), 'ok');

  calls = 0;
  const alwaysFail = async () => { calls += 1; throw new Error('timeout'); };
  const g = m.createResilientFetch(alwaysFail, 50);
  await assert.rejects(() => g('https://x.test/a', { method: 'POST' }));
  assert.equal(calls, 1, 'a write must never be retried');
});

test('a hanging fetch is aborted by the timeout instead of waiting 300s', async () => {
  const hang = (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const f = m.createResilientFetch(hang, 30);
  const started = Date.now();
  await assert.rejects(() => f('https://x.test/a', { method: 'POST' }));
  assert.ok(Date.now() - started < 1000, 'must abort quickly');
});
