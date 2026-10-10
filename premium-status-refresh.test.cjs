const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path, stubs = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module); const originalRequire = mod.require.bind(mod); mod.require = id => Object.hasOwn(stubs, id) ? stubs[id] : originalRequire(id); mod._compile(compiled, path); return mod.exports;
}

test('shouldRefreshProfile throttles to one refresh per interval', () => {
  const { shouldRefreshProfile, MIN_VISIBLE_REFRESH_MS } = loadTs('src/utils/profileVisibilityRefresh.ts', {
    '@/utils/profileCache': { refreshProfile: async () => {} },
  });
  assert.equal(MIN_VISIBLE_REFRESH_MS, 30000);
  assert.equal(shouldRefreshProfile(0, 1000), true);
  assert.equal(shouldRefreshProfile(1000, 1000 + 30000), true);
  assert.equal(shouldRefreshProfile(1000, 1000 + 29999), false);
});

test('returning to foreground refreshes the profile and listeners are ref-counted', () => {
  const handlers = { document: {}, window: {} };
  global.document = {
    visibilityState: 'hidden',
    addEventListener: (t, fn) => { handlers.document[t] = fn; },
    removeEventListener: (t) => { delete handlers.document[t]; },
  };
  global.window = {
    addEventListener: (t, fn) => { handlers.window[t] = fn; },
    removeEventListener: (t) => { delete handlers.window[t]; },
  };
  const refreshed = [];
  const mod = loadTs('src/utils/profileVisibilityRefresh.ts', {
    '@/utils/profileCache': { refreshProfile: async (id) => { refreshed.push(id); } },
  });

  const stop1 = mod.startProfileVisibilityRefresh('u1');
  const stop2 = mod.startProfileVisibilityRefresh('u1');
  assert.ok(handlers.document.visibilitychange, 'visibilitychange listener attached');
  assert.ok(handlers.window.focus, 'focus listener attached');

  global.document.visibilityState = 'visible';
  handlers.document.visibilitychange();
  assert.deepEqual(refreshed, ['u1']);

  // Throttled: a second event within the interval does not refresh again.
  handlers.window.focus();
  assert.deepEqual(refreshed, ['u1']);

  stop1();
  assert.ok(handlers.document.visibilitychange, 'listener stays while refs remain');
  stop2();
  assert.equal(handlers.document.visibilitychange, undefined, 'listener removed at zero refs');

  delete global.document; delete global.window;
});
