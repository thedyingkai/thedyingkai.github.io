import { loadConfig } from './lib/http.js?v=1.0';
import { escapeHtml as esc, setText, contentRendered, showError } from './lib/dom.js?v=1.0';
import { isExternalUrl } from './lib/urls.js?v=1.0';
import { copyText } from './lib/clipboard.js?v=1.0';
import { createFolderIndex, resourceUrl } from './cloud-model.js?v=1.0';

let config;
let tree;
let currentFolder;
const entriesTarget = document.querySelector('[data-cloud-entries]');
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
  const next = tree.folders.has(id) ? id : tree.root;
  if (push && currentFolder !== next) history.pushState(null, '', `#folder=${encodeURIComponent(next)}`);
  currentFolder = next;
  const folder = tree.folders.get(next);
  const breadcrumb = document.querySelector('[data-cloud-breadcrumb]');
  breadcrumb.innerHTML = tree.trail(next).map(item => `<button type="button" data-folder="${esc(item.id)}"${item.id === next ? ' aria-current="location"' : ''}>${esc(item.title)}</button>`).join('<span aria-hidden="true">/</span>');
  const parent = tree.parents.get(next);
  const back = document.querySelector('[data-cloud-back]');
  back.disabled = back.hidden = !parent;
  back.onclick = () => setFolder(parent);
  entriesTarget.innerHTML = folder.entries.length ? folder.entries.map(entryCard).join('') : '<div class="card"><h3>空文件夹</h3><p>这个文件夹还没有配置资源。</p></div>';
  contentRendered();
}
function bindForm() {
  const form = document.querySelector('[data-cloud-form]');
  if (!form) return;
  const input = form.elements.namedItem('path');
  const target = document.querySelector('[data-cloud-target]');
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

document.querySelector('.cloud-browser')?.addEventListener('click', async event => {
  const folder = event.target.closest('[data-folder]');
  if (folder && tree) { setFolder(folder.dataset.folder); return; }
  const button = event.target.closest('[data-copy-url]');
  if (!button) return;
  button.textContent = await copyText(button.dataset.copyUrl) ? '已复制' : '复制失败，请手动选择链接';
  setTimeout(() => { button.textContent = '复制链接'; }, 1500);
});
const restoreFolder = () => { if (tree) setFolder(folderFromHash(), false); };
addEventListener('popstate', restoreFolder);
addEventListener('hashchange', restoreFolder);

async function initialize(reload = false) {
  try {
    config = await loadConfig('cloud', { reload });
    tree = createFolderIndex(config);
    // Validate all links before installing navigation handlers.
    for (const folder of tree.folders.values()) folder.entries.filter(entry => entry.type === 'file').forEach(resolveResource);
    for (const field of ['eyebrow', 'title', 'lead']) setText(`[data-config="cloud.${field}"]`, config[field]);
    document.querySelector('[data-cloud-actions]').innerHTML = (config.actions || []).map(actionLink).join('');
    document.querySelector('[data-cloud-notes]').innerHTML = (config.notes || []).map(noteCard).join('');
    document.querySelector('[data-config-error]')?.replaceChildren();
    bindForm();
    setFolder(folderFromHash(), false);
  } catch (error) {
    tree = null;
    if (entriesTarget) showError(entriesTarget, `云盘加载失败：${error.message}`, () => initialize(true));
  }
}
void initialize();
