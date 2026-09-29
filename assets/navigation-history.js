// Keep our state in one namespace; page features may store their own fields.
const KEY = 'tdkNavigation';

export function pageHistoryState() {
  const value = history.state?.[KEY];
  return value && Number.isInteger(value.index) ? value : null;
}

export function replacePageHistory(url = location.href, { index = pageHistoryState()?.index ?? 0, scroll = [scrollX, scrollY] } = {}) {
  const state = { index, scroll, url: new URL(url, location.href).href };
  history.replaceState({ ...history.state, [KEY]: state }, '', url);
  return state;
}

export function savePageScroll() {
  return replacePageHistory();
}

export function pushPageHistory(url, { scroll = [0, 0] } = {}) {
  const state = { index: (pageHistoryState()?.index ?? 0) + 1, scroll, url: new URL(url, location.href).href };
  history.pushState({ ...history.state, [KEY]: state }, '', url);
  dispatchEvent(new Event('tdk:history-change'));
  return state;
}
