const cfgEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isExt = h => /^https?:\/\//.test(h || '');
const tagHtml = a => (a || []).map(t => `<span class="tag">${cfgEsc(t)}</span>`).join('');

function cfgCard(x) {
  const meta = x[0], title = x[1], text = x[2], href = typeof x[3] === 'string' ? x[3] : '', tags = Array.isArray(x[3]) ? x[3] : x[4];
  const open = href && href !== '#' ? `<a class="card" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>` : '<div class="card">';
  const close = href && href !== '#' ? '</a>' : '</div>';
  return `${open}<div class="card__meta"><span>${cfgEsc(meta)}</span></div><h3>${cfgEsc(title)}</h3><p>${cfgEsc(text)}</p><div class="tags">${tagHtml(tags)}</div>${close}`;
}

function timelineItem(x) {
  return `<div class="timeline__item"><span class="timeline__time">${cfgEsc(x[0])}</span><h3>${cfgEsc(x[1])}</h3></div>`;
}

async function loadConfig() {
  const res = await fetch(`/site.config.json?t=${Date.now()}`);
  if (!res.ok) throw new Error(`site.config.json ${res.status}`);
  return res.json();
}

function renderProjectPage(cfg) {
  const p = cfg.projects;
  const title = document.querySelector('[data-config="projects.title"]');
  const eyebrow = document.querySelector('[data-config="projects.eyebrow"]');
  const lead = document.querySelector('[data-config="projects.lead"]');
  if (title) title.textContent = p.title;
  if (eyebrow) eyebrow.textContent = p.eyebrow;
  if (lead) lead.textContent = p.lead;
  const featured = document.querySelector('[data-projects-featured]');
  const directions = document.querySelector('[data-projects-directions]');
  if (featured) featured.innerHTML = p.featured.map(cfgCard).join('');
  if (directions) directions.innerHTML = p.directions.map(cfgCard).join('');
}

function renderAboutPage(cfg) {
  const a = cfg.about;
  const title = document.querySelector('[data-config="about.title"]');
  const eyebrow = document.querySelector('[data-config="about.eyebrow"]');
  const lead = document.querySelector('[data-config="about.lead"]');
  if (title) title.textContent = a.title;
  if (eyebrow) eyebrow.textContent = a.eyebrow;
  if (lead) lead.textContent = a.lead;
  const cards = document.querySelector('[data-about-cards]');
  const milestones = document.querySelector('[data-about-milestones]');
  const timeline = document.querySelector('[data-about-timeline]');
  if (cards) cards.innerHTML = a.cards.map(cfgCard).join('');
  if (milestones) milestones.innerHTML = a.milestones.map(cfgCard).join('');
  if (timeline) timeline.innerHTML = (a.timeline || []).map(timelineItem).join('');
}

function renderFriendsPage(cfg) {
  const f = cfg.friends;
  if (!f) return;
  const title = document.querySelector('[data-config="friends.title"]');
  const eyebrow = document.querySelector('[data-config="friends.eyebrow"]');
  const lead = document.querySelector('[data-config="friends.lead"]');
  if (title) title.textContent = f.title;
  if (eyebrow) eyebrow.textContent = f.eyebrow;
  if (lead) lead.textContent = f.lead;
  const links = document.querySelector('[data-friends-links]');
  const apply = document.querySelector('[data-friends-apply]');
  if (links) links.innerHTML = (f.links || []).map(cfgCard).join('');
  if (apply) apply.innerHTML = (f.apply || []).map(cfgCard).join('');
}

loadConfig().then(cfg => {
  renderProjectPage(cfg);
  renderAboutPage(cfg);
  renderFriendsPage(cfg);
}).catch(e => {
  document.querySelectorAll('[data-config-error]').forEach(x => x.textContent = e.message);
});
