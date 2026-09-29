import { escapeHtml as cfgEsc, setText, contentRendered, showError } from './lib/dom.js?v=1.0';
import { safeUrl, isExternalUrl as isExt, imageUrl } from './lib/urls.js?v=1.0';
import { loadConfig as fetchConfig } from './lib/http.js?v=1.0';
import { postFiles } from './lib/posts.js?v=1.0';

const BUSUANZI_SRC = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
const busuanziValues = new Map();
const tagHtml = a => (a || []).map(t => `<span class="tag">${cfgEsc(t)}</span>`).join('');

function cardData(x) {
  if (!Array.isArray(x)) return x || {};
  const meta = x[0], title = x[1], text = x[2], href = typeof x[3] === 'string' ? x[3] : '', tags = Array.isArray(x[3]) ? x[3] : x[4];
  return { meta, title, text, href, tags };
}

function cfgCard(item) {
  const x = cardData(item);
  const href = safeUrl(x.href || '');
  const open = href && href !== '#' ? `<a class="card" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>` : '<div class="card">';
  const close = href && href !== '#' ? '</a>' : '</div>';
  return `${open}<div class="card__meta"><span>${cfgEsc(x.meta)}</span></div><h3>${cfgEsc(x.title)}</h3><p>${cfgEsc(x.text)}</p><div class="tags">${tagHtml(x.tags)}</div>${close}`;
}

function inlineLink(item) {
  const x = Array.isArray(item) ? { label: item[0], href: item[1], note: item[2] } : item;
  const href = safeUrl(x.href);
  const content = `<span>${cfgEsc(x.label)}</span>${x.note ? `<small>${cfgEsc(x.note)}</small>` : ''}`;
  if (!href) return `<span class="profile-link">${content}</span>`;
  return `<a class="profile-link" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>${content}</a>`;
}

function renderProfileBlock(profile) {
  if (!profile) return '';
  const copy = profile.intro ? `<p>${cfgEsc(profile.intro)}</p>` : '';
  const facts = (profile.facts || []).map(item => `<span>${cfgEsc(item)}</span>`).join('');
  const links = (profile.links || []).map(inlineLink).join('');
  return `<div class="profile-block"><div class="profile-copy">${copy}</div><div class="profile-facts">${facts}</div><div class="profile-links">${links}</div></div>`;
}

function friendCard(item) {
  const x = Array.isArray(item)
    ? { meta: item[0], title: item[1], text: item[2], href: item[3], tags: item[4] || [], avatar: item[5] || '' }
    : item;
  const initial = (x.title || '?').trim().slice(0, 1).toUpperCase();
  const avatar = imageUrl(x.avatar, '/');
  const avatarHtml = avatar ? `<img src="${cfgEsc(avatar)}" alt="" loading="lazy">` : `<span>${cfgEsc(initial)}</span>`;
  const href = safeUrl(x.href);
  const content = `<div class="friend-card__avatar">${avatarHtml}</div><div><div class="card__meta"><span>${cfgEsc(x.meta)}</span></div><h3>${cfgEsc(x.title)}</h3><p>${cfgEsc(x.text)}</p><div class="tags">${tagHtml(x.tags)}</div></div>`;
  if (!href) return `<div class="card friend-card">${content}</div>`;
  return `<a class="card friend-card" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>${content}</a>`;
}

function actionLink(item) {
  const x = Array.isArray(item) ? { label: item[0], href: item[1], primary: item[2] } : item;
  const cls = x.primary ? 'btn btn--primary' : 'btn';
  const href = safeUrl(x.href);
  if (!href) return `<span class="${cls}">${cfgEsc(x.label)}</span>`;
  return `<a class="${cls}" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>${cfgEsc(x.label)}</a>`;
}

function statRow(item) {
  const x = Array.isArray(item) ? { label: item[0], value: item[1] } : item;
  const value = x.value === 'auto'
    ? '<b data-post-count>0</b>'
    : x.value === 'busuanzi_site_pv'
      ? '<b><span id="busuanzi_container_site_pv"><span id="busuanzi_value_site_pv">--</span>次</span></b>'
      : x.value === 'busuanzi_site_uv'
        ? '<b><span id="busuanzi_container_site_uv"><span id="busuanzi_value_site_uv">--</span>人</span></b>'
        : `<b>${cfgEsc(x.value)}</b>`;
  return `<div class="stat"><span>${cfgEsc(x.label)}</span>${value}</div>`;
}

function loadBusuanzi({ root, onCleanup }) {
  const counters = [...root.querySelectorAll('[id^="busuanzi_value_"]')];
  if (!counters.length) return;
  const pageKey = `${location.pathname}${location.search}`;
  const counterKey = counter => counter.id === 'busuanzi_value_page_pv' ? `${counter.id}:${pageKey}` : counter.id;
  // The third-party script runs once per document. Preserve its visible site
  // counters when the home page is detached and later mounted again.
  counters.forEach(counter => {
    const key = counterKey(counter);
    if (busuanziValues.has(key)) counter.textContent = busuanziValues.get(key);
  });
  const remember = () => counters.forEach(counter => {
    const value = counter.textContent.trim();
    if (value && value !== '--') busuanziValues.set(counterKey(counter), value);
  });
  const observer = new MutationObserver(remember);
  counters.forEach(counter => observer.observe(counter, { childList: true, characterData: true, subtree: true }));
  onCleanup(() => { remember(); observer.disconnect(); });
  if (document.querySelector('script[data-busuanzi-loader]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = BUSUANZI_SRC;
  script.dataset.busuanziLoader = '1';
  document.body.append(script);
}

async function updatePostCounts({ root, signal }) {
  const targets = [...root.querySelectorAll('[data-post-count]')];
  if (!targets.length) return;
  try {
    const count = postFiles(await fetchConfig('posts')).length;
    if (signal.aborted) return;
    targets.forEach(target => { target.textContent = count; });
  } catch { if (!signal.aborted) targets.forEach(target => { target.textContent = '—'; }); }
}

function renderHomePage(cfg, { root }) {
  const h = cfg.home;
  if (!h) return;
  setText('[data-config="home.eyebrow"]', h.eyebrow, root);
  setText('[data-config="home.title"]', h.title, root);
  setText('[data-config="home.lead"]', h.lead, root);
  const actions = root.querySelector('[data-home-actions]');
  const stats = root.querySelector('[data-home-stats]');
  if (actions) actions.innerHTML = (h.actions || []).map(actionLink).join('');
  if (stats) stats.innerHTML = (h.stats || []).map(statRow).join('');
}

function renderProjectPage(cfg, { root }) {
  const p = cfg.projects;
  if (!p) return;
  setText('[data-config="projects.title"]', p.title, root);
  setText('[data-config="projects.eyebrow"]', p.eyebrow, root);
  setText('[data-config="projects.lead"]', p.lead, root);
  const featured = root.querySelector('[data-projects-featured]');
  const directions = root.querySelector('[data-projects-directions]');
  if (featured) featured.innerHTML = (p.featured || []).map(cfgCard).join('');
  if (directions) directions.innerHTML = (p.directions || []).map(cfgCard).join('');
}

async function renderAboutPage(cfg, { root, signal, onCleanup }) {
  const a = cfg.about;
  if (!a) return;
  setText('[data-config="about.title"]', a.title, root);
  setText('[data-config="about.eyebrow"]', a.eyebrow, root);
  setText('[data-config="about.lead"]', a.lead, root);
  const profile = root.querySelector('[data-about-profile]');
  const cards = root.querySelector('[data-about-cards]');
  const timeline = root.querySelector('[data-about-timeline]');
  if (profile) profile.innerHTML = renderProfileBlock(a.profile);
  if (cards) cards.innerHTML = (a.cards || []).map(cfgCard).join('');
  if (timeline) {
    const { renderTimeline } = await import('./timeline.js?v=1.1');
    if (signal.aborted) return;
    onCleanup(renderTimeline(timeline, a.timeline || []));
  }
}

function renderFriendsPage(cfg, { root }) {
  const f = cfg.friends;
  if (!f) return;
  setText('[data-config="friends.title"]', f.title, root);
  setText('[data-config="friends.eyebrow"]', f.eyebrow, root);
  setText('[data-config="friends.lead"]', f.lead, root);
  const links = root.querySelector('[data-friends-links]');
  const apply = root.querySelector('[data-friends-apply]');
  if (links) links.innerHTML = (f.links || []).map(friendCard).join('');
  if (apply) apply.innerHTML = (f.apply || []).map(cfgCard).join('');
}

const renderers = { home: renderHomePage, projects: renderProjectPage, about: renderAboutPage, friends: renderFriendsPage };
async function renderPage(name, context, reload = false) {
  const { root, signal } = context;
  if (signal.aborted) return;
  const errorTarget = root.querySelector('[data-config-error]');
  try {
    const data = await fetchConfig(name, { reload });
    if (signal.aborted) return;
    await renderers[name]({ [name]: data }, context);
    if (signal.aborted) return;
    errorTarget?.replaceChildren();
    loadBusuanzi(context);
    await updatePostCounts(context);
    if (signal.aborted) return;
    contentRendered();
  } catch (error) {
    if (signal.aborted) return;
    if (errorTarget) showError(errorTarget, `页面配置加载失败：${error.message}`, () => renderPage(name, context, true));
    else console.warn('页面配置加载失败。', error);
  }
}

export async function mountPage(context) {
  let configured = false;
  for (const name of Object.keys(renderers)) {
    if (context.signal.aborted) return;
    if (context.root.querySelector(`[data-config^="${name}."]`)) {
      configured = true;
      await renderPage(name, context);
    }
  }
  // Cloud has its own config renderer, but its counters share the same loader.
  if (!configured && !context.signal.aborted) loadBusuanzi(context);
}
