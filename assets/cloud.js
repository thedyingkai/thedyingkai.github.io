(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
  const DEFAULT_BASE_URL = 'https://dl.thedyingkai.cn/';
  const isExt = h => {
    try {
      const url = new URL(h, location.origin);
      return ['http:', 'https:'].includes(url.protocol) && url.origin !== location.origin;
    } catch {
      return false;
    }
  };
  let baseUrl = 'https://dl.thedyingkai.cn/';
  let folders = new Map();
  let rootFolder = 'root';
  let currentFolder = 'root';

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node && value != null) node.textContent = value;
  }

  function tagsHtml(tags) {
    return (tags || []).map(tag => `<span class="tag">${esc(tag)}</span>`).join('');
  }

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

  function safeHttpUrl(value, base = location.origin) {
    try {
      const url = new URL(value, base);
      return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch {
      return null;
    }
  }

  function safeHttpHref(value, fallback = DEFAULT_BASE_URL) {
    return safeHttpUrl(value)?.href || fallback;
  }

  function toResourceUrl(pathOrHref) {
    const raw = String(pathOrHref || '/').trim();
    const safeBase = safeHttpUrl(baseUrl) || new URL(DEFAULT_BASE_URL);
    if (!raw || raw === '/') return safeBase;
    if (/^https?:\/\//i.test(raw)) return safeHttpUrl(raw) || safeBase;
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return safeHttpUrl(raw.replace(/^\/+/, ''), base) || safeBase;
  }

  function downloadUrl(entry) {
    return toResourceUrl(entry.downloadUrl || entry.href || entry.downloadPath || entry.path || '/').href;
  }

  function actionUrl(action) {
    return action.href ? safeUrl(action.href, toResourceUrl(action.path || '/').href) : toResourceUrl(action.path || '/').href;
  }

  function actionLink(action) {
    const href = actionUrl(action);
    const cls = action.primary ? 'btn btn--primary' : 'btn';
    return `<a class="${cls}" href="${esc(href)}"${isExt(href) ? ' target="_blank" rel="noreferrer"' : ''}>${esc(action.label)}</a>`;
  }

  function noteCard(item) {
    return `<div class="card"><div class="card__meta"><span>${esc(item.meta)}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="tags">${tagsHtml(item.tags)}</div></div>`;
  }

  function folderCard(item) {
    return `<button class="card cloud-entry cloud-entry--folder" type="button" data-folder="${esc(item.folder)}"><div class="card__meta"><span>Folder</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text || '打开文件夹')}</p><div class="tags">${tagsHtml(item.tags)}</div></button>`;
  }

  function fileCard(item) {
    const href = downloadUrl(item);
    return `<div class="card cloud-entry cloud-entry--file"><div class="card__meta"><span>${esc(item.meta || item.size || 'File')}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text || '下载文件')}</p><p class="cloud-entry__url">${esc(href)}</p><div class="cloud-entry__actions"><a class="btn btn--primary" href="${esc(href)}" target="_blank" rel="noreferrer" download>下载</a><button class="btn" type="button" data-copy-url="${esc(href)}">复制链接</button></div><div class="tags">${tagsHtml(item.tags)}</div></div>`;
  }

  function folderParent(id) {
    for (const folder of folders.values()) {
      if ((folder.entries || []).some(item => item.type === 'folder' && item.folder === id)) return folder.id;
    }
    return '';
  }

  function folderTrail(id) {
    const trail = [];
    let cursor = folders.has(id) ? id : rootFolder;
    while (cursor && folders.has(cursor)) {
      trail.unshift(folders.get(cursor));
      if (cursor === rootFolder) break;
      cursor = folderParent(cursor);
    }
    return trail;
  }

  function folderFromHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const id = params.get('folder');
    return id && folders.has(id) ? id : rootFolder;
  }

  function setFolder(id, push = true) {
    currentFolder = folders.has(id) ? id : rootFolder;
    if (push) history.replaceState(null, '', `#folder=${encodeURIComponent(currentFolder)}`);
    renderFolder();
  }

  function renderBreadcrumb(folder) {
    const target = document.querySelector('[data-cloud-breadcrumb]');
    if (!target) return;
    target.innerHTML = folderTrail(folder.id).map(item => `<button type="button" data-folder="${esc(item.id)}">${esc(item.title)}</button>`).join('<span>/</span>');
    target.querySelectorAll('[data-folder]').forEach(button => {
      button.addEventListener('click', () => setFolder(button.dataset.folder));
    });
  }

  function copyToClipboard(text, button) {
    const done = () => {
      button.textContent = '已复制';
      setTimeout(() => { button.textContent = '复制链接'; }, 1200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => { button.textContent = '复制失败'; });
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      done();
    } finally {
      textarea.remove();
    }
  }

  function bindFolderEntries(target) {
    target.querySelectorAll('[data-folder]').forEach(button => {
      button.addEventListener('click', () => setFolder(button.dataset.folder));
    });
    target.querySelectorAll('[data-copy-url]').forEach(button => {
      button.addEventListener('click', () => copyToClipboard(button.dataset.copyUrl, button));
    });
  }

  function renderFolder() {
    const target = document.querySelector('[data-cloud-entries]');
    const back = document.querySelector('[data-cloud-back]');
    if (!target) return;

    const folder = folders.get(currentFolder) || folders.get(rootFolder);
    renderBreadcrumb(folder);
    const parent = folderParent(folder.id);
    if (back) {
      back.disabled = !parent;
      back.hidden = !parent;
      back.onclick = parent ? () => setFolder(parent) : null;
    }

    const entries = folder.entries || [];
    target.innerHTML = entries.length
      ? entries.map(item => item.type === 'folder' ? folderCard(item) : fileCard(item)).join('')
      : '<div class="card"><h3>空文件夹</h3><p>这个文件夹还没有配置资源。</p></div>';
    bindFolderEntries(target);
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
    baseUrl = safeHttpHref(cfg.baseUrl, baseUrl);
    rootFolder = cfg.rootFolder || rootFolder;
    folders = new Map((cfg.folders || []).map(folder => [folder.id, folder]));
    currentFolder = folderFromHash();
    setText('[data-config="cloud.eyebrow"]', cfg.eyebrow);
    setText('[data-config="cloud.title"]', cfg.title);
    setText('[data-config="cloud.lead"]', cfg.lead);

    const actions = document.querySelector('[data-cloud-actions]');
    const notes = document.querySelector('[data-cloud-notes]');
    if (actions) actions.innerHTML = (cfg.actions || []).map(actionLink).join('');
    if (notes) notes.innerHTML = (cfg.notes || []).map(noteCard).join('');
    bindForm();
    renderFolder();
    addEventListener('hashchange', () => setFolder(folderFromHash(), false));
  }).catch(error => {
    document.querySelectorAll('[data-config-error]').forEach(x => x.textContent = error.message);
    bindForm();
  });
})();
