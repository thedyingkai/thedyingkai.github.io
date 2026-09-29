// Real-media regression in an isolated Chromium profile, never the user's browser.
// Supports PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE and SITE_ROOT like site.browser.mjs.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = path.resolve(process.env.SITE_ROOT || fileURLToPath(new URL('../', import.meta.url)));
const artifacts = await mkdtemp(path.join(tmpdir(), 'tdk-navigation-'));
const musicConfig = JSON.parse(await readFile(path.join(root, 'config/music.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2' };
// Three minutes: repeated navigation must not accidentally reach the next track.
const wave = Buffer.alloc(44 + 8000 * 180 * 2);
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(16000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40);
const server = createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (pathname.startsWith('/tests/navigation-audio')) {
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
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': `${types[path.extname(file)] || 'text/plain'}; charset=utf-8` });
    response.end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
const documentRequests = [];
let playlistRequests = 0;
page.setDefaultTimeout(12000);
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests.push(request.url()); });
await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
await page.route('**/config/music.json*', route => route.fulfill({ json: { ...musicConfig, volume: 0, order: 'list', loop: 'all' } }));
await page.route('https://api.i-meto.com/meting/api?**', route => {
  playlistRequests++;
  return route.fulfill({ json: [
    { name: '连续播放 A', artist: '回归测试', url: `${origin}/tests/navigation-audio-a.wav`, lrc: '[00:00.00]跨页不断播放\n[02:30.00]仍然是同一首歌' },
    { name: '连续播放 B', artist: '回归测试', url: `${origin}/tests/navigation-audio-b.wav` }
  ] });
});
const articleA = '/blog/post/?file=generating-functions.md';
const articleB = '/blog/post/?file=tree-templates.md';
const sourceA = await readFile(path.join(root, 'posts/generating-functions.md'), 'utf8');
await page.route('**/posts/generating-functions.md', route => route.fulfill({
  body: `${sourceA}\n\n[导航回归：下一篇](${articleB})\n`, contentType: 'text/plain'
}));
await page.addInitScript(() => {
  const OriginalAudio = window.Audio;
  const probe = window.navigationProbe = {
    documentId: `${performance.timeOrigin}:${Math.random()}`,
    audios: [], events: [], interruptions: [], armed: false, dock: null
  };
  window.Audio = new Proxy(OriginalAudio, {
    construct(target, args, newTarget) {
      const audio = Reflect.construct(target, args, newTarget);
      const index = probe.audios.push(audio) - 1;
      for (const type of ['pause', 'emptied', 'loadstart', 'playing', 'waiting', 'ended', 'error']) {
        audio.addEventListener(type, () => probe.events.push({ type, index, time: audio.currentTime, armed: probe.armed }));
      }
      return audio;
    }
  });
  setInterval(() => {
    if (probe.armed && probe.audios[0]?.paused) probe.interruptions.push({ time: performance.now(), route: location.href });
  }, 25);
});

function waitUrl(route) { return page.waitForURL(url => url.href === new URL(route, origin).href); }
async function waitPage(route) {
  await waitUrl(route);
  const url = new URL(route, origin);
  const selector = {
    '/': '[data-post-list="home"] .card--post',
    '/blog/': '[data-post-list="blog"] .card--post',
    '/blog/post/': '[data-post-ready="true"] .render-head h1',
    '/about/': '.timeline--ready .timeline__item',
    '/projects/': '[data-projects-featured] .card',
    '/cloud/': '[data-cloud-entries] .cloud-entry',
    '/friends/': '[data-friends-links] .card'
  }[url.pathname];
  assert.ok(selector, `unknown test page ${route}`);
  await page.locator(selector).first().waitFor();
}
async function clickRoute(route, selector) {
  const link = page.locator(selector || `a[href="${route}"]`).first();
  await link.click();
  await waitPage(route);
}
async function injectedLink(route, id = 'navigation-test-link') {
  // Exercise actual delegated link handling; do not call internal router APIs.
  await page.evaluate(({ route, id }) => {
    document.getElementById(id)?.remove();
    const link = document.createElement('a');
    link.id = id; link.href = route; link.textContent = '导航测试链接';
    document.querySelector('main').prepend(link);
  }, { route, id });
  return page.locator(`#${id}`);
}
async function uiState() {
  return page.locator('.music-player').evaluate(dock => ({
    mini: dock.classList.contains('is-mini'), panelHidden: dock.querySelector('.music-player__panel').hidden,
    title: dock.querySelector('.music-player__summary strong').textContent,
    volume: dock.querySelector('[aria-label="音量"]').value,
    search: dock.querySelector('[aria-label="搜索歌单"]').value,
    settings: [...dock.querySelectorAll('.music-player__settings button')].map(button => [button.textContent, button.getAttribute('aria-pressed')])
  }));
}
let identity;
let previousTime = 0;
async function uninterrupted(label, expectedUI) {
  await page.waitForFunction(time => window.navigationProbe?.audios[0]?.currentTime > time + .03, previousTime);
  const state = await page.evaluate(() => {
    const probe = window.navigationProbe;
    const audio = probe.audios[0];
    return {
      documentId: probe.documentId, timeOrigin: performance.timeOrigin,
      count: probe.audios.length, sameDock: probe.dock === document.querySelector('.music-player'),
      paused: audio?.paused, time: audio?.currentTime, volume: audio?.volume, source: audio?.currentSrc,
      interruptions: probe.interruptions,
      resets: probe.events.filter(event => event.armed && ['pause', 'emptied', 'loadstart', 'ended', 'error'].includes(event.type))
    };
  });
  assert.equal(state.documentId, identity.documentId, `${label}: document must survive navigation`);
  assert.equal(state.timeOrigin, identity.timeOrigin, `${label}: no hidden full page reload`);
  assert.equal(state.count, 1, `${label}: create Audio only once`);
  assert.equal(state.sameDock, true, `${label}: preserve actual player DOM, not just saved settings`);
  assert.equal(state.paused, false, `${label}: media still playing`);
  assert.equal(state.volume, .37, `${label}: volume retained`);
  assert.equal(state.source, `${origin}/tests/navigation-audio-a.wav`, `${label}: source unchanged`);
  assert.deepEqual(state.interruptions, [], `${label}: no sampled pause during navigation`);
  assert.deepEqual(state.resets, [], `${label}: no pause, reload, emptied, ended or error events`);
  assert.equal(playlistRequests, 1, `${label}: playlist must not reload on each page`);
  assert.equal(documentRequests.length, 1, `${label}: only initial navigation may request a document`);
  if (expectedUI) assert.deepEqual(await uiState(), expectedUI, `${label}: panel and settings remain intact`);
  previousTime = state.time;
}

try {
  await page.goto(origin);
  await waitPage('/');
  await page.getByRole('button', { name: '加载并播放', exact: true }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  await page.waitForFunction(() => window.navigationProbe.audios[0]?.currentTime > .2);
  await page.getByRole('button', { name: '打开音乐面板', exact: true }).click();
  await page.getByRole('slider', { name: '音量', exact: true }).evaluate(input => {
    input.value = '.37'; input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: '顺序播放', exact: true }).click();
  await page.getByRole('button', { name: '列表循环', exact: true }).click();
  await page.getByRole('searchbox', { name: '搜索歌单', exact: true }).fill('连续播放');
  identity = await page.evaluate(() => {
    const probe = window.navigationProbe;
    probe.dock = document.querySelector('.music-player');
    probe.armed = true;
    return { documentId: probe.documentId, timeOrigin: performance.timeOrigin };
  });

  for (let round = 0; round < 2; round++) {
    const expectedUI = await uiState();
    await clickRoute('/blog/', '[data-site-header] a[href="/blog/"]');
    const count = await page.locator('[data-post-list="blog"] .card--post').count();
    await page.locator('[data-post-search]').fill('__no_such_post__');
    assert.equal(await page.locator('[data-post-list="blog"] .card--post').count(), 0, 'archive search initialized after soft navigation');
    await page.locator('[data-post-search]').fill('');
    assert.equal(await page.locator('[data-post-list="blog"] .card--post').count(), count);
    await uninterrupted(`round ${round}: archive`, expectedUI);

    await clickRoute(articleA);
    await page.locator('.render-toc mjx-container').first().waitFor();
    assert.equal(await page.locator('.render-toc mjx-merror').count(), 0, 'math still renders after changing page');
    await uninterrupted(`round ${round}: first article`, expectedUI);
    await clickRoute(articleB, `.render-body a[href="${articleB}"]`);
    assert.ok(await page.locator('.code-frame').count() > 0, 'second article code enhancements initialized');
    assert.match(await page.title(), /树状数组/);
    await uninterrupted(`round ${round}: second article`, expectedUI);

    await page.goBack(); await waitPage(articleA);
    await uninterrupted(`round ${round}: history back`, expectedUI);
    await page.goForward(); await waitPage(articleB);
    await uninterrupted(`round ${round}: history forward`, expectedUI);

    const tocLink = page.locator('.render-toc__link').first();
    const hash = new URL(await tocLink.getAttribute('href'), page.url()).hash;
    const beforeHash = await page.locator('[data-post-view]').elementHandle();
    await tocLink.click();
    await page.waitForFunction(hash => location.hash === hash, hash);
    assert.equal(await beforeHash.evaluate(node => node === document.querySelector('[data-post-view]')), true, 'same-page hash preserves article DOM');
    await uninterrupted(`round ${round}: article hash`, expectedUI);

    await clickRoute('/about/', '[data-site-header] a[href="/about/"]');
    assert.ok(await page.locator('.timeline__item').count() > 0, 'timeline initialized on every visit');
    await uninterrupted(`round ${round}: about`, expectedUI);
    await clickRoute('/projects/', '[data-site-header] a[href="/projects/"]');
    await uninterrupted(`round ${round}: projects`, expectedUI);
    await clickRoute('/cloud/', '[data-site-header] a[href="/cloud/"]');
    await page.locator('[data-cloud-entries] [data-folder="archive"]').click();
    await page.locator('[data-cloud-breadcrumb] [aria-current="location"][data-folder="archive"]').waitFor();
    await page.goBack();
    await page.locator('[data-cloud-entries] [data-folder="archive"]').waitFor();
    await page.goForward();
    await page.locator('[data-cloud-breadcrumb] [aria-current="location"][data-folder="archive"]').waitFor();
    await page.locator('#cloud-path').fill('javascript:alert(1)');
    assert.equal(await page.locator('#cloud-path').evaluate(input => input.checkValidity()), false);
    await uninterrupted(`round ${round}: cloud and folder history`, expectedUI);
    await clickRoute('/friends/', '[data-site-footer] a[href="/friends/"]');
    await uninterrupted(`round ${round}: friends`, expectedUI);
    await clickRoute('/', '[data-site-header] .brand');
    await uninterrupted(`round ${round}: home`, expectedUI);
    if (round === 0) await page.getByRole('button', { name: '最小化播放器', exact: true }).click();
  }
  console.log('PASS uninterrupted music: two full route loops, both articles, back/forward, hash, cloud history, page controls, retained panel/minimized/settings');

  // The old slow response must never commit after a newer navigation completes.
  let releaseSlow;
  const slowGate = new Promise(resolve => { releaseSlow = resolve; });
  const slowRoute = '/about/?navigation-slow=1';
  await page.route(`**${slowRoute}`, async route => {
    await slowGate;
    await route.fulfill({ body: await readFile(path.join(root, 'about/index.html')), contentType: 'text/html' }).catch(() => {});
  });
  const slowLink = await injectedLink(slowRoute, 'slow-navigation');
  const slowRequest = page.waitForRequest(request => request.url() === origin + slowRoute);
  await slowLink.click(); await slowRequest;
  await clickRoute('/projects/', '[data-site-header] a[href="/projects/"]');
  releaseSlow();
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).pathname, '/projects/', 'superseded response cannot replace newer page');
  assert.ok(await page.locator('[data-projects-featured] .card').count() > 0);
  await uninterrupted('slow navigation superseded');
  console.log('PASS racing navigation: delayed old response cannot overwrite the newest route');

  let releaseCancelled;
  const cancelledGate = new Promise(resolve => { releaseCancelled = resolve; });
  const cancelledRoute = '/friends/?navigation-cancel=1';
  await page.route(`**${cancelledRoute}`, async route => {
    await cancelledGate;
    await route.fulfill({ body: await readFile(path.join(root, 'friends/index.html')), contentType: 'text/html' }).catch(() => {});
  });
  const cancelledLink = await injectedLink(cancelledRoute);
  const cancelledRequest = page.waitForRequest(request => request.url() === origin + cancelledRoute);
  await cancelledLink.click(); await cancelledRequest;
  await page.locator('.navigation-notice').getByRole('button', { name: '取消', exact: true }).click();
  releaseCancelled();
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).pathname, '/projects/', 'cancel leaves the current route intact');
  assert.equal(await page.locator('.navigation-notice').isVisible(), false);
  await uninterrupted('explicitly cancelled navigation');
  console.log('PASS navigation cancellation: pending fetch cannot replace the preserved page');

  // Observe the router's decision, then suppress the browser default ourselves.
  // This tests real event handling without opening external tabs or downloads.
  const decisions = await page.evaluate(() => {
    const cases = [
      { name: 'external', href: 'https://example.org/' },
      { name: 'download', href: '/about/', download: 'about.html' },
      { name: 'new tab', href: '/about/', target: '_blank' },
      { name: 'Control-click', href: '/about/', ctrlKey: true },
      { name: 'Meta-click', href: '/about/', metaKey: true },
      { name: 'Shift-click', href: '/about/', shiftKey: true },
      { name: 'middle click', href: '/about/', button: 1 },
      { name: 'RSS', href: '/rss.xml' },
      { name: 'mailto', href: 'mailto:test@example.org' }
    ];
    return cases.map(item => {
      const anchor = document.createElement('a');
      anchor.href = item.href;
      if (item.download) anchor.download = item.download;
      if (item.target) anchor.target = item.target;
      document.body.append(anchor);
      let prevented;
      window.addEventListener('click', event => { prevented = event.defaultPrevented; event.preventDefault(); }, { once: true });
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: item.button || 0, ctrlKey: !!item.ctrlKey, metaKey: !!item.metaKey, shiftKey: !!item.shiftKey }));
      anchor.remove();
      return { name: item.name, prevented };
    });
  });
  for (const decision of decisions) assert.equal(decision.prevented, false, `${decision.name} must keep native browser behavior`);
  await uninterrupted('native link exclusions');
  console.log('PASS native link behavior: external, download, target, modifiers, middle click, RSS and mailto');

  let failureAttempts = 0;
  const failingRoute = '/about/?navigation-failure=1';
  await page.route(`**${failingRoute}`, async route => {
    failureAttempts++;
    if (failureAttempts === 1) return route.fulfill({ status: 503, body: 'temporarily unavailable', contentType: 'text/plain' });
    return route.fulfill({ body: await readFile(path.join(root, 'about/index.html')), contentType: 'text/html' });
  });
  const failingLink = await injectedLink(failingRoute);
  const previousMain = await page.locator('main').elementHandle();
  await failingLink.click();
  await page.getByRole('button', { name: /重试/ }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/projects/', 'failed click navigation leaves old URL and page');
  assert.equal(await previousMain.evaluate(node => node === document.querySelector('main')), true, 'failed HTML fetch does not discard usable content');
  await uninterrupted('failed navigation leaves music and page intact');
  await page.getByRole('button', { name: /重试/ }).click();
  await waitPage(failingRoute);
  assert.equal(failureAttempts, 2, 'retry requests the intended route again');
  await uninterrupted('navigation retry succeeds');
  console.log('PASS recoverable navigation: 503 retains page/audio, explicit retry succeeds');

  let backAttempts = 0;
  await page.route(`${origin}/projects/`, async route => {
    backAttempts++;
    if (backAttempts === 1) return route.fulfill({ status: 503, body: 'temporarily unavailable', contentType: 'text/plain' });
    return route.fulfill({ body: await readFile(path.join(root, 'projects/index.html')), contentType: 'text/html' });
  });
  await page.goBack();
  await page.locator('.navigation-notice').getByRole('button', { name: '重试', exact: true }).waitFor();
  await waitPage(failingRoute);
  await uninterrupted('failed history navigation rolls URL back to the visible page');
  await page.locator('.navigation-notice').getByRole('button', { name: '重试', exact: true }).click();
  await waitPage('/projects/');
  assert.equal(backAttempts, 2, 'failed history navigation can also be retried');
  await page.unroute(`${origin}/projects/`);
  await uninterrupted('failed history retry');
  console.log('PASS history failure: URL rollback and retry preserve the playing audio');

  const articleLink = await injectedLink(articleB);
  await articleLink.click(); await waitPage(articleB);
  await page.waitForFunction(() => document.documentElement.dataset.navigation === 'ready');
  await page.mouse.move(1000, 300);
  await page.mouse.wheel(0, 900);
  await page.waitForFunction(() => scrollY > 800);
  // Wait for the final scroll event's history snapshot, not just the input event.
  await page.waitForTimeout(100);
  const savedScroll = await page.evaluate(() => scrollY);
  await clickRoute('/projects/', '[data-site-header] a[href="/projects/"]');
  await page.goBack(); await waitPage(articleB);
  await page.waitForFunction(() => document.documentElement.dataset.navigation === 'ready');
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - savedScroll) < 3, 'back restores the saved article reading position after article content arrives');
  await uninterrupted('history reading-position restore');

  // Keep a tall loading placeholder while the article response is pending.
  // A real wheel gesture during loading must take precedence over the router's
  // deferred initial scroll restoration once the article finishes mounting.
  const scrollRoute = '/blog/post/?file=navigation-scroll.md';
  const articleHtml = await readFile(path.join(root, 'blog/post/index.html'), 'utf8');
  await page.route(origin + scrollRoute, route => route.fulfill({
    body: articleHtml.replace('data-post-view>', 'data-post-view style="min-height:4800px">'), contentType: 'text/html'
  }));
  let releaseArticle;
  const articleGate = new Promise(resolve => { releaseArticle = resolve; });
  await page.route('**/posts/navigation-scroll.md', async route => {
    await articleGate;
    return route.fulfill({ body: `---\ntitle: 滚动位置回归\n---\n\n# 长文章\n\n${'文章加载后应保留用户主动滚动的位置。\n\n'.repeat(120)}`, contentType: 'text/plain' });
  });
  const scrollLink = await injectedLink(scrollRoute);
  const articleRequest = page.waitForRequest(request => request.url() === `${origin}/posts/navigation-scroll.md`);
  await scrollLink.click(); await articleRequest; await waitUrl(scrollRoute);
  await page.mouse.move(1000, 300);
  await page.mouse.wheel(0, 700);
  await page.waitForFunction(() => scrollY > 500);
  const userScroll = await page.evaluate(() => scrollY);
  releaseArticle();
  await waitPage(scrollRoute);
  await page.waitForFunction(() => document.documentElement.dataset.navigation === 'ready');
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - userScroll) < 3, 'late page initialization must not undo a real user wheel gesture');
  await uninterrupted('user wheel during pending article initialization');
  console.log('PASS scrolling: history restores reading position; active user scroll wins over late initialization');

  await page.setViewportSize({ width: 360, height: 780 });
  await clickRoute('/blog/', '[data-site-header] a[href="/blog/"]');
  await clickRoute(articleA);
  await uninterrupted('mobile article navigation');
  await page.screenshot({ path: path.join(artifacts, 'music-continuous-mobile.png') });
  assert.equal(await page.locator('.music-player').count(), 1);
  assert.equal(await page.locator('[data-site-header]').count(), 1);
  assert.equal(await page.locator('[data-site-footer]').count(), 1);
  assert.deepEqual(errors, [], 'no uncaught page errors across repeated page lifecycles');
  console.log(`PASS all navigation regressions; artifacts: ${artifacts}`);
} finally {
  await page.screenshot({ path: path.join(artifacts, 'last-state.png') }).catch(() => {});
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
