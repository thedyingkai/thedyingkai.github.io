import { loadConfig } from './lib/http.js?v=1.0';
import { escapeHtml as esc, setText, contentRendered, showError } from './lib/dom.js?v=1.0';
import { isExternalUrl } from './lib/urls.js?v=1.0';
import { copyText } from './lib/clipboard.js?v=1.0';
import { createFolderIndex, resourceUrl } from './cloud-model.js?v=1.0';
import { pushPageHistory, savePageScroll } from './navigation-history.js?v=1.0';

export async function mountPage({ root, signal, onCleanup }) {
  if (signal.aborted) return;
  let config;
  let tree;
  let currentFolder;
  const pageUrl = new URL(location.href);
  const entriesTarget = root.querySelector('[data-cloud-entries]');
  if (!entriesTarget) return;
  const timers = new Set();
  onCleanup(() => {
    timers.forEach(clearTimeout);
    timers.clear();
    const form = root.querySelector('[data-cloud-form]');
    if (form) { form.oninput = null; form.onsubmit = null; }
    const back = root.querySelector('[data-cloud-back]');
    if (back) back.onclick = null;
  });
  const tagsHtml = tags => (tags || []).map(tag => `<span class="tag">${esc(tag)}</span>`).join('');
  const resolveResource = entry => resourceUrl(entry.downloadUrl || entry.href || entry.downloadPath || entry.path || '/', config.baseUrl);

  function actionLink(action) {
    const href = resolveResource(action);
    return `<a class="btn${action.primary ? ' btn--primary' : ''}" href="${esc(href)}"${isExternalUrl(href) ? ' target="_blank" rel="noreferrer"' : ''}>${esc(action.label)}</a>`;
  }
  function noteCard(item) {
    return `<div class="card"><div class="card__meta"><span>${esc(item.meta)}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="tags">${tagsHtml(item.tags)}</div></div>`;
  }
  function entryCard(item) {
    if (item.type === 'folder') return `<button class="card cloud-entry cloud-entry--folder" type="button" data-folder="${esc(item.folder)}"><div class="card__meta"><span>Folder</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text || '打开文件夹')}</p><div class="tags">${tagsHtml(item.tags)}</div></button>`;
    const href = resolveResource(item);
    return `<div class="card cloud-entry cloud-entry--file"><div class="card__meta"><span>${esc(item.meta || item.size || 'File')}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.text || '下载文件')}</p><p class="cloud-entry__url">${esc(href)}</p><div class="cloud-entry__actions"><a class="btn btn--primary" href="${esc(href)}" target="_blank" rel="noreferrer" download>下载</a><button class="btn" type="button" data-copy-url="${esc(href)}">复制链接</button></div><div class="tags">${tagsHtml(item.tags)}</div></div>`;
  }
  function folderFromHash() {
    const id = new URLSearchParams(location.hash.slice(1)).get('folder');
    return tree.folders.has(id) ? id : tree.root;
  }
  function setFolder(id, push = true) {
    if (signal.aborted || !tree) return;
    const next = tree.folders.has(id) ? id : tree.root;
    if (push && currentFolder !== next) {
      savePageScroll();
      pushPageHistory(`#folder=${encodeURIComponent(next)}`, { scroll: [scrollX, scrollY] });
    }
    currentFolder = next;
    const folder = tree.folders.get(next);
    const breadcrumb = root.querySelector('[data-cloud-breadcrumb]');
    breadcrumb.innerHTML = tree.trail(next).map(item => `<button type="button" data-folder="${esc(item.id)}"${item.id === next ? ' aria-current="location"' : ''}>${esc(item.title)}</button>`).join('<span aria-hidden="true">/</span>');
    const parent = tree.parents.get(next);
    const back = root.querySelector('[data-cloud-back]');
    back.disabled = back.hidden = !parent;
    back.onclick = () => setFolder(parent);
    entriesTarget.innerHTML = folder.entries.length ? folder.entries.map(entryCard).join('') : '<div class="card"><h3>空文件夹</h3><p>这个文件夹还没有配置资源。</p></div>';
    contentRendered();
  }
  function bindForm() {
    const form = root.querySelector('[data-cloud-form]');
    if (!form) return;
    const input = form.elements.namedItem('path');
    const target = root.querySelector('[data-cloud-target]');
    const update = () => {
      try {
        const url = resourceUrl(input.value, config.baseUrl);
        input.setCustomValidity('');
        input.removeAttribute('aria-invalid');
        target.textContent = url;
        return url;
      } catch (error) {
        input.setCustomValidity(error.message);
        input.setAttribute('aria-invalid', 'true');
        target.textContent = error.message;
        return '';
      }
    };
    form.oninput = update;
    form.onsubmit = event => {
      event.preventDefault();
      const url = update();
      if (url && form.reportValidity()) window.open(url, '_blank', 'noopener,noreferrer');
    };
    update();
  }

  root.querySelector('.cloud-browser')?.addEventListener('click', async event => {
    const folder = event.target.closest('[data-folder]');
    if (folder && tree) { setFolder(folder.dataset.folder); return; }
    const button = event.target.closest('[data-copy-url]');
    if (!button) return;
    const copied = await copyText(button.dataset.copyUrl);
    if (signal.aborted) return;
    button.textContent = copied ? '已复制' : '复制失败，请手动选择链接';
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!signal.aborted) button.textContent = '复制链接';
    }, 1500);
    timers.add(timer);
  }, { signal });
  const restoreFolder = () => {
    if (tree && !signal.aborted && location.pathname === pageUrl.pathname && location.search === pageUrl.search) setFolder(folderFromHash(), false);
  };
  addEventListener('popstate', restoreFolder, { signal });
  addEventListener('hashchange', restoreFolder, { signal });

  async function initialize(reload = false) {
    if (signal.aborted) return;
    try {
      config = await loadConfig('cloud', { reload });
      if (signal.aborted) return;
      tree = createFolderIndex(config);
      // Validate all links before installing navigation handlers.
      for (const folder of tree.folders.values()) folder.entries.filter(entry => entry.type === 'file').forEach(resolveResource);
      for (const field of ['eyebrow', 'title', 'lead']) setText(`[data-config="cloud.${field}"]`, config[field], root);
      root.querySelector('[data-cloud-actions]').innerHTML = (config.actions || []).map(actionLink).join('');
      root.querySelector('[data-cloud-notes]').innerHTML = (config.notes || []).map(noteCard).join('');
      root.querySelector('[data-config-error]')?.replaceChildren();
      bindForm();
      setFolder(folderFromHash(), false);
    } catch (error) {
      if (signal.aborted) return;
      tree = null;
      if (entriesTarget) showError(entriesTarget, `云盘加载失败：${error.message}`, () => initialize(true));
    }
  }
  await initialize();
}
