const cfgEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const BUSUANZI_SRC = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
const TIMELINE_LEVEL_RANK = { dot: 0, minor: 1, mid: 2, major: 3 };
const TIMELINE_VIEW_STEPS = [
  { minRank: 0, label: '全部' },
  { minRank: 1, label: '次要以上' },
  { minRank: 2, label: '主要以上' },
  { minRank: 3, label: '最大层' }
];

function safeUrl(value, fallback = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('#')) return raw;
  try {
    const url = new URL(raw, location.origin);
    if (!ALLOWED_URL_PROTOCOLS.has(url.protocol)) return fallback;
    return raw;
  } catch {
    return fallback;
  }
}

function isExt(h) {
  const safe = safeUrl(h);
  if (!safe) return false;
  try {
    const url = new URL(safe, location.origin);
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== location.origin;
  } catch {
    return false;
  }
}

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
  const avatar = safeUrl(x.avatar);
  const avatarHtml = avatar ? `<img src="${cfgEsc(avatar)}" alt="" loading="lazy">` : `<span>${cfgEsc(initial)}</span>`;
  const href = safeUrl(x.href);
  const content = `<div class="friend-card__avatar">${avatarHtml}</div><div><div class="card__meta"><span>${cfgEsc(x.meta)}</span></div><h3>${cfgEsc(x.title)}</h3><p>${cfgEsc(x.text)}</p><div class="tags">${tagHtml(x.tags)}</div></div>`;
  if (!href) return `<div class="card friend-card">${content}</div>`;
  return `<a class="card friend-card" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>${content}</a>`;
}

function timelineData(item) {
  if (!Array.isArray(item)) return item || {};
  return { date: item[0], title: item[1], level: item[2] };
}

function normalizeTimelineLevel(value) {
  const key = String(value ?? '').trim().toLowerCase();
  const map = {
    0: 'dot',
    dot: 'dot',
    tiny: 'dot',
    point: 'dot',
    none: 'dot',
    '点': 'dot',
    '最小': 'dot',
    1: 'minor',
    minor: 'minor',
    small: 'minor',
    '小': 'minor',
    2: 'mid',
    mid: 'mid',
    medium: 'mid',
    middle: 'mid',
    normal: 'mid',
    '中': 'mid',
    3: 'major',
    major: 'major',
    large: 'major',
    big: 'major',
    important: 'major',
    '大': 'major',
    '重点': 'major'
  };
  return map[key] || '';
}

function timelineLevel(item, index = 0) {
  const x = timelineData(item);
  const manualLevel = normalizeTimelineLevel(x.level ?? x.size ?? x.importance);
  if (manualLevel) return manualLevel;
  const text = `${x.title} ${x.date}`;
  if (x.important === true || /(国一|金牌|银牌|铜牌|ICPC|CCPC|线下|邀请赛)/.test(text)) return 'major';
  if (/(第一次|过审|红名|蓝名|青名|校赛|400 AC|500 AC)/.test(text)) return 'mid';
  if (/(注册|300 AC)/.test(text) || index % 7 === 0) return 'minor';
  if (/(200 AC|100 AC|绿名|橙名)/.test(text)) return 'dot';
  return 'dot';
}

function timelineRank(level) {
  return TIMELINE_LEVEL_RANK[level] ?? 0;
}

function timelineEntries(items = []) {
  return [...items]
    .sort((a, b) => String(timelineData(a).date || '').localeCompare(String(timelineData(b).date || '')))
    .map((item, index) => ({
      item,
      data: timelineData(item),
      level: timelineLevel(item, index)
    }));
}

function readTimelineViewStep() {
  return 0;
}

function timelineHeight(count = 0) {
  return `${Math.max(760, count * 54)}px`;
}

function timelineWave(t) {
  const main = Math.sin((t * 4.18 - 0.18) * Math.PI);
  const fine = Math.sin((t * 9.4 + 0.2) * Math.PI) * 0.12;
  return Math.max(12, Math.min(88, 50 + (main + fine) * 31));
}

function timelinePoint(index = 0, total = 1) {
  const t = total <= 1 ? 0.5 : index / (total - 1);
  return {
    x: timelineWave(t),
    y: 4 + t * 92
  };
}

function timelinePath(total = 1) {
  const samples = 180;
  return Array.from({ length: samples }, (_, i) => {
    const t = samples <= 1 ? 0 : i / (samples - 1);
    const x = timelineWave(t).toFixed(2);
    const y = (4 + t * 92).toFixed(2);
    return `${i ? 'L' : 'M'}${x} ${y}`;
  }).join(' ');
}

function timelineItem(entry, index = 0, items = []) {
  const x = entry?.data || timelineData(entry?.item || entry);
  const level = entry?.level || timelineLevel(entry?.item || entry, index);
  const point = timelinePoint(index, items.length || 1);
  const labelSide = point.x < 50 ? 'right' : 'left';
  const delay = (index % 12) * 90;
  const style = `--timeline-x:${point.x.toFixed(2)}%;--timeline-y:${point.y.toFixed(2)}%;--timeline-delay:${delay}ms`;
  return `<div class="timeline__item timeline__item--${cfgEsc(level)} timeline__item--${labelSide}" style="${style}" tabindex="0" aria-label="${cfgEsc(`${x.date} ${x.title}`)}"><span class="timeline__dot" aria-hidden="true"></span><span class="timeline__text"><span class="timeline__time">${cfgEsc(x.date)}</span><h3>${cfgEsc(x.title)}</h3></span></div>`;
}

function timelineHtml(entries = []) {
  const path = timelinePath(entries.length || 1);
  return `<svg class="timeline__curve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="timeline__curve-shadow" d="${path}"></path><path class="timeline__curve-main" d="${path}"></path><path class="timeline__curve-gold" d="${path}"></path></svg>${entries.map(timelineItem).join('')}`;
}

function timelineButton(label, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'timeline-controls__button';
  button.textContent = label;
  button.setAttribute('aria-label', ariaLabel);
  button.title = ariaLabel;
  return button;
}

function timelineControls(timeline) {
  const head = timeline.closest('section')?.querySelector('.section-head');
  let controls = head?.querySelector('[data-about-timeline-controls]');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'timeline-controls';
    controls.dataset.aboutTimelineControls = '';
    if (head) head.append(controls);
    else timeline.before(controls);
  }

  const collapse = timelineButton('-', '折叠一层');
  const status = document.createElement('span');
  status.className = 'timeline-controls__status';
  status.setAttribute('aria-live', 'polite');
  const expand = timelineButton('+', '展开一层');
  controls.replaceChildren(collapse, status, expand);
  return { collapse, status, expand };
}

function renderTimeline(timeline, items = []) {
  const entries = timelineEntries(items);
  const controls = timelineControls(timeline);
  let stepIndex = readTimelineViewStep();
  timeline.style.setProperty('--timeline-height', timelineHeight(entries.length));
  timeline.innerHTML = timelineHtml(entries);

  const update = () => {
    const step = TIMELINE_VIEW_STEPS[stepIndex] || TIMELINE_VIEW_STEPS[0];
    const visibleLabels = entries.filter(entry => timelineRank(entry.level) >= step.minRank).length;
    timeline.dataset.labelMinRank = String(step.minRank);
    controls.status.textContent = `${step.label} · ${visibleLabels}/${entries.length}`;
    controls.collapse.disabled = stepIndex >= TIMELINE_VIEW_STEPS.length - 1;
    controls.expand.disabled = stepIndex <= 0;
  };

  const changeStep = delta => {
    const next = Math.max(0, Math.min(TIMELINE_VIEW_STEPS.length - 1, stepIndex + delta));
    if (next === stepIndex) return;
    stepIndex = next;
    update();
  };

  controls.collapse.addEventListener('click', () => changeStep(1));
  controls.expand.addEventListener('click', () => changeStep(-1));
  update();
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
  if (timeline) {
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
