const cfgEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isExt = h => /^https?:\/\//.test(h || '');
const tagHtml = a => (a || []).map(t => `<span class="tag">${cfgEsc(t)}</span>`).join('');

function cardData(x) {
  if (!Array.isArray(x)) return x || {};
  const meta = x[0], title = x[1], text = x[2], href = typeof x[3] === 'string' ? x[3] : '', tags = Array.isArray(x[3]) ? x[3] : x[4];
  return { meta, title, text, href, tags };
}

function cfgCard(item) {
  const x = cardData(item);
  const href = x.href || '';
  const open = href && href !== '#' ? `<a class="card" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>` : '<div class="card">';
  const close = href && href !== '#' ? '</a>' : '</div>';
  return `${open}<div class="card__meta"><span>${cfgEsc(x.meta)}</span></div><h3>${cfgEsc(x.title)}</h3><p>${cfgEsc(x.text)}</p><div class="tags">${tagHtml(x.tags)}</div>${close}`;
}

function inlineLink(item) {
  const x = Array.isArray(item) ? { label: item[0], href: item[1], note: item[2] } : item;
  const external = isExt(x.href);
  return `<a class="profile-link" href="${cfgEsc(x.href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}><span>${cfgEsc(x.label)}</span>${x.note ? `<small>${cfgEsc(x.note)}</small>` : ''}</a>`;
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
  const avatarHtml = x.avatar ? `<img src="${cfgEsc(x.avatar)}" alt="" loading="lazy">` : `<span>${cfgEsc(initial)}</span>`;
  return `<a class="card friend-card" href="${cfgEsc(x.href)}"${isExt(x.href) ? ' target="_blank" rel="noreferrer"' : ''}><div class="friend-card__avatar">${avatarHtml}</div><div><div class="card__meta"><span>${cfgEsc(x.meta)}</span></div><h3>${cfgEsc(x.title)}</h3><p>${cfgEsc(x.text)}</p><div class="tags">${tagHtml(x.tags)}</div></div></a>`;
}

function timelineItem(item) {
  const x = Array.isArray(item) ? { date: item[0], title: item[1] } : item;
  return `<div class="timeline__item"><span class="timeline__time">${cfgEsc(x.date)}</span><h3>${cfgEsc(x.title)}</h3></div>`;
}

function actionLink(item) {
  const x = Array.isArray(item) ? { label: item[0], href: item[1], primary: item[2] } : item;
  const cls = x.primary ? 'btn btn--primary' : 'btn';
  return `<a class="${cls}" href="${cfgEsc(x.href)}"${isExt(x.href) ? ' target="_blank" rel="noreferrer"' : ''}>${cfgEsc(x.label)}</a>`;
}

function statRow(item) {
  const x = Array.isArray(item) ? { label: item[0], value: item[1] } : item;
  const value = x.value === 'auto' ? '<b data-post-count>0</b>' : `<b>${cfgEsc(x.value)}</b>`;
  return `<div class="stat"><span>${cfgEsc(x.label)}</span>${value}</div>`;
}

async function fetchConfig(name) {
  const res = await fetch(`/config/${name}.json?t=${Date.now()}`);
  if (!res.ok) throw new Error(`config/${name}.json ${res.status}`);
  return [name, await res.json()];
}

async function loadConfig() {
  const parts = await Promise.all(['home', 'about', 'projects', 'friends'].map(fetchConfig));
  return Object.fromEntries(parts);
}

async function updatePostCounts() {
  const targets = [...document.querySelectorAll('[data-post-count]')];
  if (!targets.length) return;
  try {
    const res = await fetch(`/config/posts.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`config/posts.json ${res.status}`);
    const manifest = await res.json();
    const files = Array.isArray(manifest) ? manifest : manifest.files;
    const count = (files || []).filter(name => typeof name === 'string' && name.endsWith('.md') && !name.includes('/') && !name.startsWith('_')).length;
    targets.forEach(target => target.textContent = count);
  } catch { }
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node && value != null) node.textContent = value;
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

function renderAboutPage(cfg) {
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
  if (timeline) timeline.innerHTML = (a.timeline || []).map(timelineItem).join('');
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

loadConfig().then(cfg => {
  renderHomePage(cfg);
  renderProjectPage(cfg);
  renderAboutPage(cfg);
  renderFriendsPage(cfg);
  updatePostCounts();
  window.dispatchEvent(new Event('tdk:content-rendered'));
}).catch(e => {
  document.querySelectorAll('[data-config-error]').forEach(x => x.textContent = e.message);
});
