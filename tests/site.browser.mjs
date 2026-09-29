// Isolated regression browser: does not attach to a user's browser/profile.
// npm install --no-save playwright, then npx playwright install chromium.
// Existing tool runtimes can set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const artifacts = await mkdtemp(path.join(tmpdir(), 'tdk-blog-fix-'));
const musicConfig = JSON.parse(await readFile(path.join(root, 'config/music.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const wave = Buffer.alloc(44 + 8000 * 60 * 2);
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(16000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40);
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname.startsWith('/tests/audio')) {
    const range = /bytes=(\d+)-(\d*)/.exec(request.headers.range || '');
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), wave.length - 1) : wave.length - 1;
    response.writeHead(range ? 206 : 200, {
      'content-type': 'audio/wav', 'accept-ranges': 'bytes', 'content-length': end - start + 1,
      ...(range ? { 'content-range': `bytes ${start}-${end}/${wave.length}` } : {})
    });
    response.end(wave.subarray(start, end + 1)); return;
  }
  const file = path.resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  try { response.writeHead(200, { 'content-type': `${types[path.extname(file)] || 'text/plain'}; charset=utf-8` }); response.end(await readFile(file)); }
  catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
console.log(`Testing ${origin}; screenshots: ${artifacts}`);
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(8000);
await context.route('**/*', async route => {
  const url = route.request().url();
  if (url.startsWith(origin)) await route.continue();
  else await route.abort(); // Deterministic, no third-party trackers/media.
});
await page.route('**/config/music.json*', route => route.fulfill({ json: { ...musicConfig, volume: 0, order: 'list' } }));

try {
  const raw = '#include <bits/stdc++.h>\nint main() {\n\tcout << "$<tag>&$" << "\\n";\n\t// 中文注释 ' + ' long_content'.repeat(25) + '\n\n}\n';
  // The pinned Markdown 4 parser expands tabs before tokenizing. Copy must
  // preserve its code text exactly, without line numbers or lost HTML/math.
  const expectedCode = raw.replace(/\t/g, '    ');
  const fixture = `---\ntitle: 代码渲染回归\n---\n## 代码与公式\n$dp_{k,x}$，$a < b$。\n\n\`\`\`cpp\n${raw}\`\`\`\n\n\`\`\`text\n$<b>$ should stay text\n\`\`\`\n\n\`\`\`unknown\nordinary text\n\`\`\`\n\n\`\`\`cpp\n/* multi\nline */\n\n\`\`\`\n`;
  await page.route('**/posts/render-regression.md', route => route.fulfill({ body: fixture, contentType: 'text/plain' }));
  await page.goto(`${origin}/blog/post/?file=render-regression.md`);
  await page.locator('.code-frame').first().waitFor();
  assert.equal(await page.locator('.code-frame').count(), 4);
  assert.equal(await page.locator('.code-pre code').first().textContent(), expectedCode);
  assert.equal(await page.locator('.code-pre tag, .code-pre b, .code-pre mjx-container').count(), 0);
  assert.equal(await page.locator('.code-frame').nth(1).locator('.hljs-keyword').count(), 0);
  await page.locator('mjx-container').first().waitFor();
  const initial = await page.locator('.code-scroller').first().evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
  assert.ok(initial.scroll > initial.width, 'long code must scroll horizontally');
  await page.locator('.code-frame').first().getByRole('button', { name: '自动换行' }).click();
  const wrapped = await page.locator('.code-frame').first().evaluate(frame => {
    const scroller = frame.querySelector('.code-scroller');
    return { width: scroller.clientWidth, scroll: scroller.scrollWidth, aligned: [...frame.querySelectorAll('.code-line')].every(line => {
      const a = line.querySelector('.code-line-number').getBoundingClientRect();
      const b = line.querySelector('.code-line-content').getBoundingClientRect();
      return Math.abs(a.top - b.top) < 1 && Math.abs(a.height - b.height) < 1;
    }) };
  });
  assert.ok(wrapped.scroll <= wrapped.width + 1, 'wrapped code must fit');
  assert.ok(wrapped.aligned, 'numbers must align with wrapped rows');
  await page.locator('.music-player').evaluate(node => { node.hidden = true; });
  await page.locator('.code-frame').first().screenshot({ path: path.join(artifacts, 'code-desktop.png') });
  // Exercise denied Clipboard API and verify the exact fallback value.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
    document.execCommand = command => { window.copiedCode = document.querySelector('.code-copy-buffer').value; return command === 'copy'; };
  });
  await page.locator('.code-frame').first().getByRole('button', { name: '复制', exact: true }).click();
  await page.getByRole('button', { name: '已复制', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.copiedCode), expectedCode);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.locator('.code-frame').first().screenshot({ path: path.join(artifacts, 'code-mobile.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  console.log('PASS code: math isolation, exact copy fallback, long lines, wrap, line numbers, mobile');

  await page.route('**/assets/vendor/mathjax/**', route => route.abort());
  await page.reload();
  await page.locator('.render-notice').waitFor();
  assert.equal(await page.locator('.code-frame').count(), 4);
  console.log('PASS article remains readable when MathJax fails');
  await page.unroute('**/assets/vendor/mathjax/**');

  let attempts = 0;
  await page.route('https://api.i-meto.com/meting/api?**', route => {
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, body: 'unavailable' });
    return route.fulfill({ json: [
      { name: '测试曲 A', artist: '歌手甲', url: `${origin}/tests/audio-a.wav`, lrc: '[00:00.00]第一句\n[00:20.00]第二句' },
      { name: '测试曲 B', artist: '歌手乙', url: `${origin}/tests/audio-b.wav` },
      { name: '测试曲 C', artist: '歌手丙', url: `${origin}/tests/audio-c.wav` }
    ] });
  });
  await page.goto(`${origin}/about/`);
  await page.getByRole('button', { name: '加载并播放', exact: true }).waitFor();
  assert.equal(attempts, 0, 'no provider request before clicking play');
  await page.getByRole('button', { name: '加载并播放', exact: true }).click();
  await page.getByRole('button', { name: '重试播放', exact: true }).waitFor();
  assert.equal(attempts, 1);
  await page.getByRole('button', { name: '重试播放', exact: true }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  assert.equal(attempts, 2);
  await page.getByRole('button', { name: '打开音乐面板', exact: true }).click();
  await page.locator('.music-player__track').first().waitFor();
  await page.getByRole('slider', { name: '播放进度' }).waitFor();
  assert.equal(await page.locator('.music-player__track').count(), 3);
  await page.getByRole('searchbox', { name: '搜索歌单' }).fill('歌手乙');
  assert.equal(await page.locator('.music-player__track').count(), 1);
  await page.getByRole('button', { name: '播放 测试曲 B，歌手乙' }).click();
  assert.equal(await page.locator('.music-player__summary strong').textContent(), '测试曲 B');
  await page.getByRole('searchbox', { name: '搜索歌单' }).fill('');
  await page.getByRole('button', { name: '下一首', exact: true }).click();
  assert.equal(await page.locator('.music-player__summary strong').textContent(), '测试曲 C');
  await page.getByRole('button', { name: '上一首', exact: true }).click();
  assert.equal(await page.locator('.music-player__summary strong').textContent(), '测试曲 B');
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  await page.locator('.music-player__progress input:enabled').waitFor();
  assert.equal(await page.locator('.music-player__progress > span').last().textContent(), '1:00');
  await page.getByRole('slider', { name: '播放进度' }).focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.getByRole('button', { name: '播放', exact: true }).waitFor();
  // Drag previews must not be overwritten by media timeupdate while dragging.
  await page.getByRole('slider', { name: '播放进度' }).evaluate(input => {
    input.value = '500'; input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(await page.locator('.music-player__progress > span').first().textContent(), '0:30');
  await page.getByRole('slider', { name: '播放进度' }).dispatchEvent('change');
  assert.equal(await page.locator('.music-player__progress > span').first().textContent(), '0:30');
  await page.locator('.music-player').screenshot({ path: path.join(artifacts, 'music-mobile.png') });
  assert.ok(await page.evaluate(() => {
    const r = document.querySelector('.music-player').getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
  }));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.music-player__panel').isVisible(), false);
  await page.getByRole('button', { name: '最小化播放器', exact: true }).click();
  assert.ok((await page.locator('.music-player').boundingBox()).width < 180);
  await page.getByRole('button', { name: '展开播放器', exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: '打开音乐面板', exact: true }).click();
  await page.locator('.music-player').screenshot({ path: path.join(artifacts, 'music-desktop.png') });
  await page.goto(`${origin}/projects/`);
  await page.getByRole('button', { name: '加载并播放', exact: true }).waitFor();
  assert.equal(attempts, 2, 'navigation must not auto-fetch/autoplay');
  await page.getByRole('button', { name: '加载并播放', exact: true }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  assert.equal(await page.locator('.music-player__summary strong').textContent(), '测试曲 B', 'restore by song URL');
  await page.getByRole('button', { name: '打开音乐面板', exact: true }).click();
  await page.locator('.music-player__progress input:enabled').waitFor();
  assert.match(await page.locator('.music-player__progress > span').first().textContent(), /^0:3\d$/, 'restore the actual timestamp');
  console.log('PASS music: lazy loading, provider failure/retry, real audio playback, search, switch, seek, pause, minimize, Escape, persistence');

  // Playback failure must remain actionable, with no stale async play result.
  await page.route('**/tests/audio-c.wav', route => route.fulfill({ status: 404, body: 'unavailable' }));
  await page.getByRole('button', { name: '下一首', exact: true }).click();
  await page.getByRole('button', { name: '重试播放', exact: true }).waitFor();
  await page.getByRole('button', { name: '上一首', exact: true }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  await page.unroute('**/tests/audio-c.wav');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.evaluate(() => {
    window.originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
  });
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await page.getByText('歌单已就绪，请再点一次播放。浏览器阻止了自动播放。', { exact: true }).waitFor();
  await page.evaluate(() => { HTMLMediaElement.prototype.play = window.originalPlay; });
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  for (const size of [{ width: 320, height: 568 }, { width: 800, height: 360 }]) {
    await page.setViewportSize(size);
    assert.ok(await page.evaluate(() => {
      const r = document.querySelector('.music-player').getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
    }), 'player must fit small/landscape screens');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  console.log('PASS music edge cases: unavailable track, autoplay denial, small/landscape screens');

  const posts = JSON.parse(await readFile(path.join(root, 'config/posts.json'), 'utf8')).files;
  for (const file of posts) {
    await page.goto(`${origin}/blog/post/?file=${encodeURIComponent(file)}`);
    await page.locator('.render-head').waitFor();
    assert.equal(await page.locator('h1').first().textContent() === 'Load failed', false, file);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), file);
  }
  for (const route of ['/', '/blog/', '/about/', '/projects/', '/friends/', '/cloud/', '/404.html']) {
    await page.goto(origin + route);
    await page.locator('.brand').waitFor();
    await page.locator('.music-player').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route);
  }
  await page.route('**/config/home.json*', route => route.fulfill({ status: 500, body: 'broken unrelated config' }));
  await page.goto(`${origin}/about/`);
  await page.locator('.timeline--ready').waitFor();
  assert.equal(await page.locator('.timeline__item').count(), 37);
  await page.unroute('**/config/home.json*');
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get: () => { throw new Error('Storage denied'); } });
  });
  await page.goto(`${origin}/projects/`);
  await page.getByRole('button', { name: '加载并播放', exact: true }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  console.log('PASS config isolation and playback with storage disabled');
  assert.deepEqual(errors, []);
  console.log(`PASS ${posts.length} real posts + 7 page routes; no uncaught page errors`);
  console.log(`Screenshots: ${artifacts}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
