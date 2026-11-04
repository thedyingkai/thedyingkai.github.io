const ENDPOINT = 'https://busuanzi.ibruce.info/busuanzi';
const fields = ['site_pv', 'site_uv', 'page_pv'];
const values = new Map();
const requests = new Map();
let sequence = 0;

const valueKey = (field, page) => field === 'page_pv' ? `${field}:${page}` : field;

function requestCounts(page, needsPageCount) {
  // A pending response also contains site totals, even if it was requested by
  // a page that only displays its own reading count.
  const pending = requests.get(page) || (!needsPageCount && requests.values().next().value);
  if (pending) return pending;
  const request = new Promise((resolve, reject) => {
    const callback = `BusuanziCallback_tdk_${Date.now()}_${++sequence}`;
    const script = document.createElement('script');
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      script.remove();
      delete window[callback];
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error('访问统计请求超时')), 12000);
    window[callback] = data => {
      if (!fields.every(field => Number.isSafeInteger(data?.[field]) && data[field] >= 0)) {
        finish(new Error('访问统计响应无效'));
        return;
      }
      // Cache the complete response, independently of which DOM nodes exist.
      // A late response must not lower newer totals or update another page's PV.
      for (const field of fields) {
        const key = valueKey(field, page);
        values.set(key, Math.max(values.get(key) ?? 0, data[field]));
      }
      finish();
    };
    script.async = true;
    script.src = `${ENDPOINT}?jsonpCallback=${callback}`;
    // Match the provider's client so page counts retain the full referring URL.
    script.referrerPolicy = 'no-referrer-when-downgrade';
    script.onerror = () => finish(new Error('访问统计加载失败'));
    script.onload = () => finish(new Error('访问统计未返回数据'));
    document.head.append(script);
  }).finally(() => requests.delete(page));
  requests.set(page, request);
  return request;
}

export function mountVisitCounters({ root, signal, onCleanup }) {
  const counters = fields.flatMap(field => {
    const node = root.querySelector(`#busuanzi_value_${field}`);
    if (!node) return [];
    const container = root.querySelector(`#busuanzi_container_${field}`);
    return [{ field, node, container, unit: container?.querySelector('[data-counter-unit]') }];
  });
  if (!counters.length || signal.aborted) return;
  const page = `${location.pathname}${location.search}`;
  let loading = false;

  const render = (failed = false) => {
    if (signal.aborted) return;
    for (const { field, node, container, unit } of counters) {
      const value = values.get(valueKey(field, page));
      const unavailable = failed && value === undefined;
      if (unit) unit.hidden = unavailable;
      container?.setAttribute('aria-busy', String(loading && value === undefined));
      node.replaceChildren();
      if (unavailable) {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'counter-retry';
        retry.dataset.counterRetry = '1';
        retry.textContent = '重试';
        retry.title = '访问统计暂时不可用，点击重试';
        retry.setAttribute('aria-label', retry.title);
        node.append(retry);
      } else node.textContent = value === undefined ? '--' : String(value);
    }
  };

  const load = async () => {
    if (loading || signal.aborted) return;
    if (counters.every(({ field }) => values.has(valueKey(field, page)))) {
      render();
      return;
    }
    loading = true;
    render();
    let failed = false;
    try { await requestCounts(page, counters.some(({ field }) => field === 'page_pv')); }
    catch { failed = true; }
    loading = false;
    render(failed);
  };
  const retry = event => {
    if (event.target.closest('[data-counter-retry]')) void load();
  };
  root.addEventListener('click', retry);
  onCleanup(() => root.removeEventListener('click', retry));
  void load();
}
