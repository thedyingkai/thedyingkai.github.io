const cfgEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isExt = h => /^https?:\/\//.test(h || '');
const tagHtml = a => (a || []).map(t => `<span class="tag">${cfgEsc(t)}</span>`).join('');

function cfgCard(x) {
  const meta = x[0], title = x[1], text = x[2], href = typeof x[3] === 'string' ? x[3] : '', tags = Array.isArray(x[3]) ? x[3] : x[4];
  const open = href && href !== '#' ? `<a class="card" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>` : '<div class="card">';
  const close = href && href !== '#' ? '</a>' : '</div>';
  return `${open}<div class="card__meta"><span>${cfgEsc(meta)}</span></div><h3>${cfgEsc(title)}</h3><p>${cfgEsc(text)}</p><div class="tags">${tagHtml(tags)}</div>${close}`;
}

function inlineLink(x) {
  const label = x[0], href = x[1], note = x[2];
  const external = isExt(href);
  return `<a class="profile-link" href="${cfgEsc(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}><span>${cfgEsc(label)}</span>${note ? `<small>${cfgEsc(note)}</small>` : ''}</a>`;
}

function renderProfileBlock(profile) {
  if (!profile) return '';
  const facts = (profile.facts || []).map(item => `<span>${cfgEsc(item)}</span>`).join('');
  const links = (profile.links || []).map(inlineLink).join('');
  return `<div class="profile-block"><div class="profile-copy"><p>${cfgEsc(profile.intro)}</p><p>${cfgEsc(profile.note)}</p></div><div class="profile-facts">${facts}</div><div class="profile-links">${links}</div></div>`;
}

function friendCard(x) {
  const meta = x[0], title = x[1], text = x[2], href = x[3], tags = x[4] || [], avatar = x[5] || '';
  const initial = (title || '?').trim().slice(0, 1).toUpperCase();
  const avatarHtml = avatar ? `<img src="${cfgEsc(avatar)}" alt="" loading="lazy">` : `<span>${cfgEsc(initial)}</span>`;
  return `<a class="card friend-card" href="${cfgEsc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}><div class="friend-card__avatar">${avatarHtml}</div><div><div class="card__meta"><span>${cfgEsc(meta)}</span></div><h3>${cfgEsc(title)}</h3><p>${cfgEsc(text)}</p><div class="tags">${tagHtml(tags)}</div></div></a>`;
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
  const profile = document.querySelector('[data-about-profile]');
  const cards = document.querySelector('[data-about-cards]');
  const milestones = document.querySelector('[data-about-milestones]');
  const timeline = document.querySelector('[data-about-timeline]');
  if (profile) profile.innerHTML = renderProfileBlock(a.profile);
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
  if (links) links.innerHTML = (f.links || []).map(friendCard).join('');
  if (apply) apply.innerHTML = (f.apply || []).map(cfgCard).join('');
}

loadConfig().then(cfg => {
  renderProjectPage(cfg);
  renderAboutPage(cfg);
  renderFriendsPage(cfg);
}).catch(e => {
  document.querySelectorAll('[data-config-error]').forEach(x => x.textContent = e.message);
});
