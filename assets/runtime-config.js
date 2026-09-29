import { escapeHtml as cfgEsc, setText, contentRendered, showError } from './lib/dom.js?v=1.0';
import { safeUrl, isExternalUrl as isExt, imageUrl } from './lib/urls.js?v=1.0';
import { loadConfig as fetchConfig } from './lib/http.js?v=1.0';
import { postFiles } from './lib/posts.js?v=1.0';

const BUSUANZI_SRC = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
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

function loadBusuanzi() {
  if (
    (!document.getElementById('busuanzi_value_site_pv') &&
      !document.getElementById('busuanzi_value_site_uv') &&
      !document.getElementById('busuanzi_value_page_pv'))
    || document.querySelector('script[data-busuanzi-loader]')
  ) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = BUSUANZI_SRC;
  script.dataset.busuanziLoader = '1';
  document.body.append(script);
}

async function updatePostCounts() {
  const targets = [...document.querySelectorAll('[data-post-count]')];
  if (!targets.length) return;
  try {
    const count = postFiles(await fetchConfig('posts')).length;
    targets.forEach(target => { target.textContent = count; });
  } catch { targets.forEach(target => { target.textContent = '—'; }); }
}

function renderHomePage(cfg) {
  const h = cfg.home;
  if (!h) return;
  setText('[data-config="home.eyebrow"]', h.eyebrow);
  setText('[data-config="home.title"]', h.title);
  setText('[data-config="home.lead"]', h.lead);
  const actions = document.querySelector('[data-home-actions]');
  const stats = document.querySelector('[data-home-stats]');
  if (actions) actions.innerHTML = (h.actions || []).map(actionLink).join('');
  if (stats) stats.innerHTML = (h.stats || []).map(statRow).join('');
  loadBusuanzi();
}

function renderProjectPage(cfg) {
  const p = cfg.projects;
  if (!p) return;
  setText('[data-config="projects.title"]', p.title);
  setText('[data-config="projects.eyebrow"]', p.eyebrow);
  setText('[data-config="projects.lead"]', p.lead);
  const featured = document.querySelector('[data-projects-featured]');
  const directions = document.querySelector('[data-projects-directions]');
  if (featured) featured.innerHTML = (p.featured || []).map(cfgCard).join('');
  if (directions) directions.innerHTML = (p.directions || []).map(cfgCard).join('');
}

async function renderAboutPage(cfg) {
  const a = cfg.about;
  if (!a) return;
  setText('[data-config="about.title"]', a.title);
  setText('[data-config="about.eyebrow"]', a.eyebrow);
  setText('[data-config="about.lead"]', a.lead);
  const profile = document.querySelector('[data-about-profile]');
  const cards = document.querySelector('[data-about-cards]');
  const timeline = document.querySelector('[data-about-timeline]');
  if (profile) profile.innerHTML = renderProfileBlock(a.profile);
  if (cards) cards.innerHTML = (a.cards || []).map(cfgCard).join('');
  if (timeline) {
    const { renderTimeline } = await import('./timeline.js?v=1.0');
    renderTimeline(timeline, a.timeline || []);
  }
}

function renderFriendsPage(cfg) {
  const f = cfg.friends;
  if (!f) return;
  setText('[data-config="friends.title"]', f.title);
  setText('[data-config="friends.eyebrow"]', f.eyebrow);
  setText('[data-config="friends.lead"]', f.lead);
  const links = document.querySelector('[data-friends-links]');
  const apply = document.querySelector('[data-friends-apply]');
  if (links) links.innerHTML = (f.links || []).map(friendCard).join('');
  if (apply) apply.innerHTML = (f.apply || []).map(cfgCard).join('');
}

const renderers = { home: renderHomePage, projects: renderProjectPage, about: renderAboutPage, friends: renderFriendsPage };
async function renderPage(name, reload = false) {
  const errorTarget = document.querySelector('[data-config-error]');
  try {
    const data = await fetchConfig(name, { reload });
    await renderers[name]({ [name]: data });
    errorTarget?.replaceChildren();
    loadBusuanzi();
    await updatePostCounts();
    contentRendered();
  } catch (error) {
    if (errorTarget) showError(errorTarget, `页面配置加载失败：${error.message}`, () => renderPage(name, true));
    else console.warn('页面配置加载失败。', error);
  }
}
for (const name of Object.keys(renderers)) {
  if (document.querySelector(`[data-config^="${name}."]`)) void renderPage(name);
}
