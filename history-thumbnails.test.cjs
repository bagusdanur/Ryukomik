const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path, stubs = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(path, module);
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => (Object.hasOwn(stubs, id) ? stubs[id] : originalRequire(id));
  mod._compile(compiled, path);
  return mod.exports;
}

const m = loadTs('src/utils/historyThumbnail.ts');

test('normalizeProjectSlug takes the series segment and sanitises it', () => {
  assert.equal(m.normalizeProjectSlug('psycho-apartment/chapter-3'), 'psycho-apartment');
  assert.equal(m.normalizeProjectSlug('Psycho Apartment?!'), 'psycho-apartment');
  assert.equal(m.normalizeProjectSlug('  /student-jo-eun/ '), 'student-jo-eun');
  assert.equal(m.normalizeProjectSlug(''), '');
  assert.equal(m.normalizeProjectSlug('../../etc/passwd'), 'etc');
});

test('projectCoverCandidates lists storage cover extensions in order', () => {
  const urls = m.projectCoverCandidates('psycho-apartment');
  assert.deepEqual(
    urls.map((u) => u.split('.').pop()),
    ['png', 'webp', 'jpg'],
  );
  for (const url of urls) {
    assert.match(url, /^https:\/\/storage\.ryukomik\.my\.id\/covers\/psycho-apartment\/cover\.(png|webp|jpg)$/);
  }
  assert.deepEqual(m.projectCoverCandidates(''), []);
});

test('itemsMissingThumbnails skips covered entries, dedupes and caps', () => {
  const items = [
    { comicSlug: 'a', source: 'komiku', thumbnail: 'x' },
    { comicSlug: 'b', source: 'komiku' },
    { comicSlug: 'b', source: 'komiku' },
    { comicSlug: 'b', source: 'josei' },
    { comicSlug: '', source: 'komiku' },
    { comicSlug: 'c', source: 'project', thumbnail: '' },
  ];
  const picked = m.itemsMissingThumbnails(items, 2);
  assert.equal(picked.length, 2);
  assert.deepEqual(
    picked.map((i) => `${i.source}|${i.comicSlug}`),
    ['komiku|b', 'josei|b'],
  );
  assert.equal(m.itemsMissingThumbnails(items, 10).length, 3);
  assert.equal(m.itemsMissingThumbnails([], 5).length, 0);
});

test('chapterNumberFrom parses labels and plain numbers', () => {
  assert.equal(m.chapterNumberFrom('Chapter 389'), 389);
  assert.equal(m.chapterNumberFrom('Ch. 12.5'), 12.5);
  assert.equal(m.chapterNumberFrom(42), 42);
  assert.equal(m.chapterNumberFrom(''), null);
  assert.equal(m.chapterNumberFrom(null), null);
});

test('chaptersBehind never goes negative and needs both sides', () => {
  assert.equal(m.chaptersBehind(120, 131), 11);
  assert.equal(m.chaptersBehind(131, 131), 0);
  assert.equal(m.chaptersBehind(140, 131), 0);
  assert.equal(m.chaptersBehind(null, 131), null);
  assert.equal(m.chaptersBehind(120, null), null);
});
