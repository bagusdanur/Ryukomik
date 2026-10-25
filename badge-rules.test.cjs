const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(path, module);
  mod._compile(compiled, path);
  return mod.exports;
}

const m = loadTs('src/lib/badgeRules.ts');

test('urutan badge mengikuti aturan, bukan urutan pemanggil', () => {
  const ids = m.visibleBadgeIds({
    role: 'admin',
    isPremium: true,
    totalReads: 1500,
    xpRank: 1,
    titleRushRank: 2,
    marathon: { rank: 1, period: 'weekly' },
  });
  assert.deepEqual(ids, ['admin', 'vip', 'marathon', 'community', 'xpRank', 'titleRush']);
});

test('badge hanya muncul kalau syaratnya terpenuhi', () => {
  assert.deepEqual(m.visibleBadgeIds({}), []);
  assert.deepEqual(m.visibleBadgeIds({ role: 'user' }), []);
  assert.deepEqual(m.visibleBadgeIds({ role: 'staff' }), ['staff']);
  assert.deepEqual(m.visibleBadgeIds({ totalReads: 299 }), []);
  assert.deepEqual(m.visibleBadgeIds({ totalReads: 300 }), ['community']);
  assert.deepEqual(m.visibleBadgeIds({ xpRank: 4 }), []);
  assert.deepEqual(m.visibleBadgeIds({ titleRushRank: 3 }), ['titleRush']);
});

test('marathon butuh rank valid', () => {
  assert.deepEqual(m.visibleBadgeIds({ marathon: { rank: 0, period: 'weekly' } }), []);
  assert.deepEqual(m.visibleBadgeIds({ marathon: { rank: 3, period: 'monthly' } }), ['marathon']);
});

test('max membatasi jumlah setelah diurutkan', () => {
  const ids = m.visibleBadgeIds(
    { role: 'admin', isPremium: true, totalReads: 1000, xpRank: 1 },
    2,
  );
  assert.deepEqual(ids, ['admin', 'vip']);
});
