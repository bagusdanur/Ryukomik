const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path, stubs = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module); const originalRequire = mod.require.bind(mod); mod.require = id => Object.hasOwn(stubs, id) ? stubs[id] : originalRequire(id); mod._compile(compiled, path); return mod.exports;
}

const m = loadTs('src/lib/marathon/period.ts');

test('weekKey follows ISO week boundaries in Asia/Jakarta', () => {
  // Minggu 25 Okt 2026 23:59 WIB  -> masih minggu W43
  assert.equal(m.weekKey(new Date('2026-10-25T16:59:00Z')), '2026-W43');
  // Senin 26 Okt 2026 00:00 WIB  -> sudah minggu W44
  assert.equal(m.weekKey(new Date('2026-10-25T17:00:00Z')), '2026-W44');
  // tengah minggu tetap sama
  assert.equal(m.weekKey(new Date('2026-10-28T05:00:00Z')), '2026-W44');
  assert.match(m.weekKey(new Date()), /^\d{4}-W\d{2}$/);
});

test('monthKey follows the WIB calendar month, not UTC', () => {
  // 31 Okt 2026 23:59 WIB
  assert.equal(m.monthKey(new Date('2026-10-31T16:59:00Z')), '2026-10');
  // 1 Nov 2026 00:00 WIB (masih 31 Okt di UTC)
  assert.equal(m.monthKey(new Date('2026-10-31T17:00:00Z')), '2026-11');
  assert.match(m.monthKey(new Date()), /^\d{4}-\d{2}$/);
});

test('isEventActive respects window, end date and the active flag', () => {
  const ev = { starts_at: '2026-11-01T00:00:00+07:00', ends_at: '2026-12-31T23:59:59+07:00', is_active: true };
  assert.equal(m.isEventActive(ev, new Date('2026-11-10T00:00:00+07:00')), true);
  assert.equal(m.isEventActive(ev, new Date('2026-10-31T23:59:59+07:00')), false, 'sebelum mulai');
  assert.equal(m.isEventActive(ev, new Date('2026-12-31T23:59:59+07:00')), true, 'tepat di akhir');
  assert.equal(m.isEventActive(ev, new Date('2027-01-01T00:00:00+07:00')), false, 'setelah selesai');
  assert.equal(m.isEventActive({ ...ev, is_active: false }, new Date('2026-11-10T00:00:00+07:00')), false);
  assert.equal(m.isEventActive({ starts_at: '2026-11-01T00:00:00+07:00', ends_at: null, is_active: true }, new Date('2030-01-01T00:00:00Z')), true, 'rolling tanpa akhir');
  assert.equal(m.isEventActive({ starts_at: 'bukan-tanggal', is_active: true }, new Date()), false, 'data rusak = nonaktif');
});

test('capRemaining never goes negative and never exceeds the cap', () => {
  assert.equal(m.capRemaining(0, 300), 300);
  assert.equal(m.capRemaining(299, 300), 1);
  assert.equal(m.capRemaining(300, 300), 0);
  assert.equal(m.capRemaining(500, 300), 0);
  assert.equal(m.capRemaining(-5, 300), 300);
});

test('previous period helpers used by the finalizer', () => {
  assert.equal(m.previousWeekKey(new Date('2026-10-28T05:00:00Z')), '2026-W43');
  assert.equal(m.previousWeekKey(new Date('2026-11-02T05:00:00Z')), '2026-W44');
  assert.equal(m.previousMonthKey(new Date('2026-11-15T05:00:00Z')), '2026-10');
  assert.equal(m.previousMonthKey(new Date('2027-01-05T05:00:00Z')), '2026-12');
});
