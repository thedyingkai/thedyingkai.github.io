import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePost, parseMetaValue, postDate, postFiles, comparePosts } from '../assets/lib/posts.js';
import { safeUrl, httpUrl, imageUrl, isPostFile, postUrl } from '../assets/lib/urls.js';
import { fetchResource, loadConfig, mapConcurrent } from '../assets/lib/http.js';
import { createFolderIndex, resourceUrl } from '../assets/cloud-model.js';
import { timelineEntries } from '../assets/timeline-model.js';
import { buildSiteData, projectRoot } from '../scripts/generate-site-data.mjs';
import { validateSite } from '../scripts/validate-site.mjs';

test('one front-matter parser handles BOM, CRLF, quotes, commas and EOF delimiters', () => {
  const source = '\uFEFF---\r\ntitle: "Title: with colon"\r\ndescription: \'保留 \\alpha\'\r\ntags: ["one, two", \'three\', 数学]\r\ncover_alt: 插图\r\n---\r\n正文 \\alpha';
  const post = parsePost('note.md', source);
  assert.equal(post.title, 'Title: with colon');
  assert.equal(post.description, '保留 \\alpha');
  assert.deepEqual(post.tags, ['one, two', 'three', '数学']);
  assert.equal(post.body, '正文 \\alpha');
  assert.equal(post.coverAlt, '插图');
  assert.equal(parsePost('x.md', '---\ntitle: abc\n---').title, 'abc');
  assert.equal(parsePost('x.md', '# A heading\ntext').title, 'A heading');
  assert.equal(parsePost('x.md', 'text').date, '');
  assert.deepEqual(parseMetaValue('[]'), []);
  assert.equal(parseMetaValue("'it''s fine'"), "it's fine");
});

test('calendar dates sort chronologically and reject rollover / invalid dates', () => {
  assert.equal(postDate('2025.8.4'), postDate('2025-08-04'));
  assert.equal(new Date(postDate('2025.08.04')).toISOString(), '2025-08-03T16:00:00.000Z');
  for (const value of ['', 'Post', '2025-02-29', '2026-13-01', '2026-04-31']) assert.equal(postDate(value), 0);
  assert.ok(postDate('2024-02-29'));
  const posts = [{ fileName: 'b.md', date: '2025.9.1' }, { fileName: 'a.md', date: '2025.10.1' }];
  assert.equal(posts.sort(comparePosts)[0].fileName, 'a.md');
});

test('post paths cannot escape the public post directory', () => {
  for (const value of ['../a.md', 'a/b.md', 'a\\b.md', '_draft.md', 'a.md?x', 'a.md#x', 'a\0.md', null]) {
    assert.equal(isPostFile(value), false, String(value));
    assert.throws(() => parsePost(value, ''), /filename/);
  }
  assert.deepEqual(postFiles({ files: ['a.md', 'a.md'] }), ['a.md']);
  assert.deepEqual(postFiles(['中文 笔记.md']), ['中文 笔记.md']);
  assert.throws(() => postFiles({ files: ['../a.md'] }));
  assert.equal(postUrl('中文 笔记.md'), '/blog/post/?file=' + encodeURIComponent('中文 笔记.md'));
});

test('URL policies distinguish navigable links from HTTP images and audio', () => {
  const base = 'https://example.org/blog/';
  assert.equal(safeUrl('mailto:a@example.org', '', base), 'mailto:a@example.org');
  for (const value of ['javascript:alert(1)', 'data:text/html,x', 'file:///tmp/x', 'java\nscript:alert(1)']) {
    assert.equal(safeUrl(value, '', base), '');
    assert.equal(httpUrl(value, base), '');
  }
  assert.equal(httpUrl('', base), '');
  assert.equal(imageUrl('cover.jpg', '/assets/images/', base), 'https://example.org/assets/images/cover.jpg');
  assert.equal(imageUrl('//cdn.example.org/x.png', '', base), 'https://cdn.example.org/x.png');
  assert.equal(imageUrl('mailto:a@example.org', '', base), '');
});

test('bounded post loading preserves input order and isolates individual failures', async () => {
  let active = 0, maximum = 0;
  const results = await mapConcurrent([0, 1, 2, 3, 4], async value => {
    maximum = Math.max(maximum, ++active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    if (value === 2) throw new Error('missing');
    return value * 2;
  }, 2);
  assert.equal(maximum, 2);
  assert.deepEqual(results.map(item => item.status), ['fulfilled', 'fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
  assert.deepEqual(results.filter(item => item.status === 'fulfilled').map(item => item.value), [0, 2, 6, 8]);
});

test('shared config requests are deduplicated and failed loads can retry', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: calls > 1, status: 503, json: async () => ({ ok: true }) };
  };
  try {
    const first = loadConfig('test-settings');
    assert.equal(first, loadConfig('test-settings'));
    await assert.rejects(first, /503/);
    assert.deepEqual(await loadConfig('test-settings'), { ok: true });
    await loadConfig('test-settings');
    assert.equal(calls, 2);
    await loadConfig('test-settings', { reload: true });
    assert.equal(calls, 3);
    assert.throws(() => loadConfig('../x'));
  } finally { globalThis.fetch = original; }
});

test('HTTP cancellation covers the response body and preserves caller abort', async () => {
  const fetcher = async (_, { signal }) => ({ ok: true, text: () => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('body aborted')), { once: true });
  }) });
  await assert.rejects(fetchResource('/slow', { format: 'text', timeout: 5, fetcher }), /body aborted/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchResource('/x', { signal: controller.signal, fetcher: async (_, { signal }) => { assert.ok(signal.aborted); throw new Error('aborted'); } }), /aborted/);
});

const folder = (id, children = []) => ({ id, title: id, entries: children.map(child => ({ type: 'folder', folder: child })) });
test('cloud folder trails have stable direct parents and reject bad graphs', () => {
  const tree = createFolderIndex({ folders: [folder('root', ['a']), folder('a', ['b']), folder('b')] });
  assert.deepEqual(tree.trail('b').map(item => item.id), ['root', 'a', 'b']);
  assert.equal(tree.parents.get('b'), 'a');
  assert.deepEqual(tree.trail('missing').map(item => item.id), ['root']);
  for (const folders of [
    [folder('a')], [folder('root'), folder('root')], [folder('root', ['missing'])],
    [folder('root', ['a']), folder('a', ['root'])],
    [folder('root'), folder('a', ['b']), folder('b', ['a'])],
    [folder('root', ['a', 'b']), folder('a', ['b']), folder('b')],
    [folder('root'), folder('orphan')]
  ]) assert.throws(() => createFolderIndex({ folders }));
});

test('cloud rejects invalid links instead of silently opening the root', () => {
  const base = 'https://dl.example.org/resources/';
  assert.equal(resourceUrl('资料/a.zip', base), 'https://dl.example.org/resources/%E8%B5%84%E6%96%99/a.zip');
  assert.equal(resourceUrl('/a.zip', base), 'https://dl.example.org/resources/a.zip');
  assert.equal(resourceUrl('https://cdn.example.org/a', base), 'https://cdn.example.org/a');
  assert.equal(resourceUrl('', base), base);
  assert.throws(() => resourceUrl('javascript:alert(1)', base));
  assert.throws(() => resourceUrl('file:///C:/a', base));
  assert.throws(() => resourceUrl('a', 'broken base'));
});

test('timeline requires explicit levels, real dates and titles', () => {
  assert.throws(() => timelineEntries([{ date: '2026-01-09', title: '一等奖' }]), /level/);
  assert.throws(() => timelineEntries([{ date: '2026-01-09', title: '银牌', level: 'auto' }]), /level/);
  assert.throws(() => timelineEntries([{ date: '2026-02-30', title: 'X', level: 'mid' }]), /date/);
  assert.equal(timelineEntries([['2026-01-09', 'X', 'major']])[0].level, 'major');
  assert.deepEqual(timelineEntries([]), []);
});

test('generated index/feed/sitemap are deterministic and include all published posts', async () => {
  const first = await buildSiteData();
  const second = await buildSiteData();
  assert.deepEqual([...first.outputs], [...second.outputs]);
  const manifest = JSON.parse(first.outputs.get('config/posts.json'));
  assert.equal(manifest.version, 2);
  assert.equal(manifest.posts.length, manifest.files.length);
  assert.ok(manifest.files.includes('icpc-2025-online-1-writeup.md'));
  assert.ok(manifest.posts.every(post => !Object.hasOwn(post, 'body')));
  for (const [file, value] of first.outputs) assert.equal((await readFile(new URL('../' + file, import.meta.url), 'utf8')).replace(/\r\n/g, '\n'), value);
  assert.ok(first.outputs.get('rss.xml').includes('icpc-2025-online-1-writeup.md'));
});

test('public configs, assets, module imports and generated files validate together', async () => {
  const result = await validateSite(projectRoot);
  assert.equal(result.posts, (await buildSiteData()).posts.length);
  const about = JSON.parse(await readFile(new URL('../config/about.json', import.meta.url), 'utf8'));
  assert.equal(result.timeline, about.timeline.length);
});
