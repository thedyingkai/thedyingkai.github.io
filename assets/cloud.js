(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isExt = h => /^https?:\/\//.test(h || '');
  let baseUrl = 'https://dl.thedyingkai.cn/';

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node && value != null) node.textContent = value;
  }

  function tagsHtml(tags) {
    return (tags || []).map(tag => `<span class="tag">${esc(tag)}</span>`).join('');
  }

  function toResourceUrl(pathOrHref) {
    const raw = String(pathOrHref || '/').trim();
    if (!raw) return new URL(baseUrl);
    if (isExt(raw)) return new URL(raw);
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL(raw.replace(/^\/+/, ''), base);
  }

  function actionUrl(action) {
    return action.href ? action.href : toResourceUrl(action.path || '/').href;
  }

  function actionLink(action) {
    const href = actionUrl(action);
    const cls = action.primary ? 'btn btn--primary' : 'btn';
    return `<a class="${cls}" href="${esc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>${esc(action.label)}</a>`;
  }

  function card(item) {
    const href = toResourceUrl(item.href || item.path || '/').href;
    return `<a class="card" href="${esc(href)}" target="_blank" rel="noreferrer"><div class="card__meta"><span>${esc(item.meta)}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="tags">${tagsHtml(item.tags)}</div></a>`;
  }

  function noteCard(item) {
    return `<div class="card"><div class="card__meta"><span>${esc(item.meta)}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="tags">${tagsHtml(item.tags)}</div></div>`;
  }

  function bindForm() {
    const form = document.querySelector('[data-cloud-form]');
    const target = document.querySelector('[data-cloud-target]');
    if (!form) return;

    const updateTarget = () => {
      const url = toResourceUrl(new FormData(form).get('path')).href;
      if (target) target.textContent = url;
      return url;
    };

    form.addEventListener('input', updateTarget);
    form.addEventListener('submit', event => {
      event.preventDefault();
      window.open(updateTarget(), '_blank', 'noopener');
    });
    updateTarget();
  }

  async function loadCloudConfig() {
    const res = await fetch(`/config/cloud.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`config/cloud.json ${res.status}`);
    return res.json();
  }

  loadCloudConfig().then(cfg => {
    baseUrl = cfg.baseUrl || baseUrl;
    setText('[data-config="cloud.eyebrow"]', cfg.eyebrow);
    setText('[data-config="cloud.title"]', cfg.title);
    setText('[data-config="cloud.lead"]', cfg.lead);

    const actions = document.querySelector('[data-cloud-actions]');
    const resources = document.querySelector('[data-cloud-resources]');
    const notes = document.querySelector('[data-cloud-notes]');
    if (actions) actions.innerHTML = (cfg.actions || []).map(actionLink).join('');
    if (resources) resources.innerHTML = (cfg.resources || []).map(card).join('');
    if (notes) notes.innerHTML = (cfg.notes || []).map(noteCard).join('');
    bindForm();
  }).catch(error => {
    document.querySelectorAll('[data-config-error]').forEach(x => x.textContent = error.message);
    bindForm();
  });
})();
