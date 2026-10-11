const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path, stubs = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module); const originalRequire = mod.require.bind(mod); mod.require = id => Object.hasOwn(stubs, id) ? stubs[id] : originalRequire(id); mod._compile(compiled, path); return mod.exports;
}

const policy = loadTs('src/lib/adGatingPolicy.ts');

test('ad script is never loaded while premium status is unknown or premium', () => {
  const { shouldLoadAdScripts } = policy;
  // Guest: safe to load once we know there is no user.
  assert.equal(shouldLoadAdScripts({ userLoading: false, hasUser: false, premiumLoading: false, isPremium: false }), true);
  // Still resolving the session -> wait.
  assert.equal(shouldLoadAdScripts({ userLoading: true, hasUser: false, premiumLoading: false, isPremium: false }), false);
  // Logged in but premium status not yet known -> wait (this is the stale-cache window).
  assert.equal(shouldLoadAdScripts({ userLoading: false, hasUser: true, premiumLoading: true, isPremium: false }), false);
  // Known non-premium -> load.
  assert.equal(shouldLoadAdScripts({ userLoading: false, hasUser: true, premiumLoading: false, isPremium: false }), true);
  // Known premium -> never load.
  assert.equal(shouldLoadAdScripts({ userLoading: false, hasUser: true, premiumLoading: false, isPremium: true }), false);
});

test('cleanup removes third-party ad traces by host, not only our own tags', () => {
  const { AD_REMOVAL_SELECTORS } = policy;
  const joined = AD_REMOVAL_SELECTORS.join(' | ');
  // Our own injected tags (regression guard: must still be covered).
  assert.ok(joined.includes('[data-ad-provider]'), 'keeps data-ad-provider selector');
  // Third-party traces injected by tag.min.js (the actual regression).
  assert.ok(/script\[src\*="al5sm\.com"\]/.test(joined), 'removes al5sm scripts by host');
  assert.ok(/iframe\[src\*="al5sm\.com"\]/.test(joined), 'removes al5sm iframes by host');
  assert.ok(/gaslah\.my\.id/.test(joined), 'removes gaslah (RajaAPK) traces');
  // Must cover the tag.min.js self-injected popunder/vignette containers.
  assert.ok(joined.includes('script[data-zone]'), 'removes zone-tagged scripts');
});

test('support ad is hidden while premium status loads, not only when premium', () => {
  const { shouldShowSupportAd } = policy;
  assert.equal(shouldShowSupportAd({ loading: true, isPremium: false }), false, 'no flicker while loading');
  assert.equal(shouldShowSupportAd({ loading: false, isPremium: true }), false);
  assert.equal(shouldShowSupportAd({ loading: false, isPremium: false }), true);
});
