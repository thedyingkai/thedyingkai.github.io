import { element, contentRendered } from './lib/dom.js?v=1.0';
import { mountPageContent } from './page-runtime.js?v=1.0';
import { pageHistoryState, replacePageHistory, savePageScroll, pushPageHistory } from './navigation-history.js?v=1.0';

const routes = new Set(['/', '/blog/', '/blog/post/', '/about/', '/projects/', '/cloud/', '/friends/', '/404.html']);

export function pagePath(path) {
  const normalized = path.replace(/\/index\.html$/, '/');
  return normalized.endsWith('/') || normalized.endsWith('.html') ? normalized : normalized + '/';
}

export function isSitePage(url, current) {
  return /^https?:$/.test(url.protocol) && url.origin === current.origin && !url.username && !url.password && routes.has(pagePath(url.pathname));
}

export function samePage(a, b) {
  return pagePath(a.pathname) === pagePath(b.pathname) && a.search === b.search && a.origin === b.origin;
}

export function mayNavigateLink(event, link) {
  return !!link && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
    !link.hasAttribute('download') && !link.hasAttribute('data-native-navigation') &&
    (!link.target || link.target.toLowerCase() === '_self') && !!link.getAttribute('href');
}

function scrollToFragment(hash) {
  let id;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
  if (!id) { scrollTo({ top: 0, left: 0, behavior: 'instant' }); return; }
  document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
}

const styleLoads = new Map();
function ensureStyles(nextDocument) {
  return Promise.all([...nextDocument.querySelectorAll('head link[rel="stylesheet"]')].map(source => {
    const href = new URL(source.getAttribute('href'), location.origin);
    if (href.origin !== location.origin || !href.pathname.startsWith('/assets/')) throw new Error('页面样式地址不受支持');
    if (styleLoads.has(href.href)) return styleLoads.get(href.href);
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href === href.href);
    if (existing?.sheet) return;
    const link = existing || source.cloneNode();
    link.href = href.href;
    const promise = new Promise((resolve, reject) => {
      const finish = error => {
        clearTimeout(timer);
        link.removeEventListener('load', loaded);
        link.removeEventListener('error', failed);
        if (error) { link.remove(); reject(error); } else resolve();
      };
      const loaded = () => finish();
      const failed = () => finish(new Error('页面样式加载失败'));
      const timer = setTimeout(() => finish(new Error('页面样式加载超时')), 12000);
      link.addEventListener('load', loaded, { once: true });
      link.addEventListener('error', failed, { once: true });
      if (!existing) document.head.append(link);
    }).catch(error => { styleLoads.delete(href.href); throw error; });
    styleLoads.set(href.href, promise);
    return promise;
  }));
}

export function initNavigation({ onNavigate = () => {} } = {}) {
  let root = document.querySelector('main');
  if (!root) return;
  let activeUrl = new URL(location.href);
  let activeState = replacePageHistory();
  let page = mountPageContent(root);
  let request;
  let sequence = 0;
  let scrollFrame = 0;
  let rollback = false;
  let interaction = 0;
  history.scrollRestoration = 'manual';
  for (const name of ['wheel', 'touchmove', 'pointerdown', 'keydown']) {
    addEventListener(name, () => { interaction++; }, { passive: true, capture: true });
  }
  const initialInteraction = interaction;

  const notice = element('div', 'navigation-notice');
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  document.body.append(notice);
  const clearNotice = () => { notice.hidden = true; notice.replaceChildren(); };
  const busy = value => {
    document.documentElement.classList.toggle('is-navigating', value);
    document.documentElement.dataset.navigation = value ? 'loading' : 'ready';
  };
  const button = (label, action) => {
    const node = element('button', 'btn', label);
    node.type = 'button';
    node.addEventListener('click', action, { once: true });
    return node;
  };
  const remember = () => {
    // A popstate already changed the URL, but the old page may still be visible.
    if (location.href !== activeUrl.href) return;
    activeState = savePageScroll();
  };
  const restorePosition = (url, state, pop) => {
    if (pop && Array.isArray(state?.scroll)) scrollTo({ left: state.scroll[0], top: state.scroll[1], behavior: 'instant' });
    else if (url.hash) scrollToFragment(url.hash);
    else scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  const restoreFailedPop = () => {
    const target = pageHistoryState();
    const delta = activeState.index - (target?.index ?? activeState.index);
    if (delta) { rollback = true; history.go(delta); }
    else replacePageHistory(activeUrl, activeState);
  };

  async function navigate(url, { pop = false, state = null } = {}) {
    const navigation = ++sequence;
    request?.abort();
    request = new AbortController();
    const { signal } = request;
    remember();
    busy(true);
    notice.hidden = false;
    notice.replaceChildren(element('span', '', '正在打开页面，音乐继续播放…'), button('取消', () => {
      if (navigation !== sequence) return;
      sequence++;
      request.abort();
      busy(false);
      clearNotice();
      if (pop) restoreFailedPop();
    }));
    const timer = setTimeout(() => request?.signal === signal && request.abort(new Error('页面加载超时')), 15000);
    try {
      const response = await fetch(url, { signal, cache: 'no-cache', headers: { Accept: 'text/html' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('目标不是页面');
      const resolved = new URL(response.url);
      if (!isSitePage(resolved, activeUrl) || !samePage(resolved, url)) throw new Error('页面重定向到了其他地址');
      const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = parsed.querySelector('main');
      if (!next || !parsed.querySelector('[data-site-header]') || !parsed.querySelector('script[data-site-shell="1"]')) throw new Error('页面版本不兼容，请稍后重试');
      // Only known modules are initialized; fetched scripts are never executed.
      next.querySelectorAll('script').forEach(script => script.remove());
      await ensureStyles(parsed);
      if (navigation !== sequence) return;
      if (signal.aborted) throw signal.reason || new Error('页面加载已取消');
      remember();
      page.dispose();
      if (!pop) pushPageHistory(url);
      else if (!pageHistoryState()) replacePageHistory(url);
      activeUrl = new URL(location.href);
      activeState = pageHistoryState();
      root.replaceWith(next);
      root = next;
      document.title = parsed.title;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = parsed.querySelector('meta[name="description"]')?.content || '';
      onNavigate();
      contentRendered();
      page = mountPageContent(root);
      // Commit the page now; async page data must not keep the network timeout alive.
      clearTimeout(timer);
      clearNotice();
      const restoreInteraction = interaction;
      if (!pop && !activeUrl.hash && !document.querySelector('.music-player')?.contains(document.activeElement)) {
        root.tabIndex = -1;
        root.focus({ preventScroll: true });
      }
      restorePosition(activeUrl, state, pop);
      await page.ready;
      if (navigation !== sequence) return;
      if (interaction === restoreInteraction) restorePosition(activeUrl, state, pop);
      busy(false);
      remember();
      dispatchEvent(new Event('tdk:navigation-end'));
    } catch (error) {
      if (navigation !== sequence) return;
      busy(false);
      console.warn('站内导航失败，保留当前页面和音乐。', error);
      if (pop) restoreFailedPop();
      notice.hidden = false;
      notice.replaceChildren(element('span', '', `页面未能打开（${error.message}）。当前页面和音乐已保留。`),
        button('重试', () => void navigate(url)), button('关闭', clearNotice));
    } finally { clearTimeout(timer); }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!mayNavigateLink(event, link)) return;
    const url = new URL(link.href);
    if (!isSitePage(url, activeUrl)) return;
    event.preventDefault();
    if (samePage(url, activeUrl) && url.href.includes('#')) {
      sequence++;
      request?.abort();
      busy(false);
      clearNotice();
      remember();
      if (location.href !== url.href) pushPageHistory(url);
      scrollToFragment(url.hash);
      // Directory links may encode state in a fragment, not an element ID.
      dispatchEvent(new Event('hashchange'));
      return;
    }
    void navigate(url);
  });

  addEventListener('popstate', () => {
    if (rollback) { rollback = false; return; }
    const url = new URL(location.href);
    if (samePage(url, activeUrl)) {
      sequence++;
      request?.abort();
      clearNotice();
      busy(false);
      activeUrl = url;
      activeState = pageHistoryState() || replacePageHistory(url, { index: activeState.index + 1 });
      restorePosition(url, activeState, true);
    } else if (isSitePage(url, activeUrl)) void navigate(url, { pop: true, state: pageHistoryState() });
  });
  const syncSamePageHistory = () => {
    const url = new URL(location.href);
    if (samePage(url, activeUrl)) {
      activeUrl = url;
      activeState = pageHistoryState() || replacePageHistory(url, { index: activeState.index + 1 });
    }
  };
  addEventListener('hashchange', syncSamePageHistory);
  addEventListener('tdk:history-change', syncSamePageHistory);
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; remember(); });
  }, { passive: true });
  addEventListener('pagehide', remember);
  page.ready.then(() => {
    if (sequence) return;
    if (activeUrl.hash && interaction === initialInteraction) scrollToFragment(activeUrl.hash);
    busy(false);
    dispatchEvent(new Event('tdk:navigation-end'));
  });
}
