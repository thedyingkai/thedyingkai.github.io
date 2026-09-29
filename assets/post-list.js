import { loadPostIndex } from './post-store.js?v=1.0';
import { loadConfig } from './lib/http.js?v=1.0';
import { imageUrl, postUrl } from './lib/urls.js?v=1.0';
import { escapeHtml as esc, contentRendered, showError, element as el } from './lib/dom.js?v=1.0';

const normalize = value => String(value ?? '').trim().toLocaleLowerCase('zh-CN');
const cleanups = new WeakMap();

function postCard(post, { withCover, coverBasePath }) {
  const card = el('a', 'card card--post');
  card.href = postUrl(post.fileName);
  const cover = withCover ? imageUrl(post.cover, coverBasePath) : '';
  const thumb = cover ? `<div class="post-card__thumb"><img src="${esc(cover)}" alt="${esc(post.coverAlt || post.title)}" loading="lazy" decoding="async"></div>` : '';
  card.classList.toggle('card--with-image', !!cover);
  card.innerHTML = `${thumb}<div class="card__meta"><span>${esc(post.date)}</span></div><h3>${esc(post.title)}</h3><p>${esc(post.description)}</p><div class="tags">${post.tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div>`;
  return card;
}

// CSS controls 1/2/3 columns. Batch measurements, then write row spans; never
// rebuild cards on resize, so keyboard focus and chronological DOM order survive.
function masonry(target) {
  let frame = 0;
  const resize = new ResizeObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const items = [...target.querySelectorAll('.post-masonry__item')];
      const heights = items.map(item => item.firstElementChild.offsetHeight);
      items.forEach((item, index) => { item.style.gridRowEnd = `span ${Math.ceil((heights[index] + 18) / 2)}`; });
    });
  });
  target.querySelectorAll('.card').forEach(card => resize.observe(card));
  return () => { resize.disconnect(); cancelAnimationFrame(frame); };
}

function renderCards(target, posts, options) {
  cleanups.get(target)?.();
  const nodes = posts.map(post => {
    const card = postCard(post, options);
    if (target.dataset.postLayout !== 'masonry') return card;
    const item = el('div', 'post-masonry__item');
    item.append(card);
    return item;
  });
  if (!nodes.length) {
    const empty = el('div', 'card');
    empty.append(el('h3', '', '没有匹配文章'), el('p', '', '换个关键词或标签试试。'));
    nodes.push(empty);
  }
  target.replaceChildren(...nodes);
  if (target.dataset.postLayout === 'masonry') cleanups.set(target, masonry(target));
  contentRendered();
}

function setupTools(posts, target, options) {
  const toolbar = document.querySelector('[data-post-tools]');
  if (!toolbar) { renderCards(target, posts, options); return; }
  const input = toolbar.querySelector('[data-post-search]');
  const tagList = toolbar.querySelector('[data-post-tags]');
  const count = toolbar.querySelector('[data-post-result-count]');
  const selected = new Set();
  toolbar.hidden = false;
  count?.setAttribute('aria-live', 'polite');
  const tags = [...new Set(posts.flatMap(post => post.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  if (tagList) tagList.innerHTML = tags.map(tag => `<button class="tag-filter" type="button" data-tag="${esc(tag)}" aria-pressed="false">${esc(tag)}</button>`).join('');
  const searchable = posts.map(post => normalize([post.title, post.description, post.date, ...post.tags].join(' ')));
  const render = () => {
    const query = normalize(input?.value);
    const matches = posts.filter((post, index) => (!query || searchable[index].includes(query)) && [...selected].every(tag => post.tags.includes(tag)));
    renderCards(target, matches, options);
    if (count) count.textContent = `${matches.length} / ${posts.length} 篇`;
  };
  // Property handlers are replaced on retry, not accumulated.
  if (input) input.oninput = render;
  if (tagList) tagList.onclick = event => {
    const button = event.target.closest('[data-tag]');
    if (!button) return;
    const tag = button.dataset.tag;
    selected.has(tag) ? selected.delete(tag) : selected.add(tag);
    button.classList.toggle('is-active', selected.has(tag));
    button.setAttribute('aria-pressed', String(selected.has(tag)));
    render();
  };
  render();
}

async function renderPostLists(reload = false) {
  const lists = [...document.querySelectorAll('[data-post-list]')];
  if (!lists.length) return;
  lists.forEach(target => target.setAttribute('aria-busy', 'true'));
  try {
    const { posts, files, failures } = await loadPostIndex({ reload });
    const cfg = posts.some(post => post.cover) ? await loadConfig('images').catch(() => ({})) : {};
    document.querySelectorAll('[data-post-count]').forEach(node => { node.textContent = files.length; });
    for (const target of lists) {
      const options = { withCover: target.dataset.postList === 'blog', coverBasePath: cfg.basePath };
      if (options.withCover) setupTools(posts, target, options);
      else renderCards(target, posts, options);
      target.previousElementSibling?.matches('[data-post-warning]') && target.previousElementSibling.remove();
      if (failures.length) {
        const notice = el('p', 'load-warning', `${failures.length} 篇文章暂未加载，其余文章仍可阅读。`);
        notice.dataset.postWarning = '';
        const retry = el('button', 'btn', '重试');
        retry.type = 'button';
        retry.onclick = () => renderPostLists(true);
        notice.append(retry);
        target.before(notice);
      }
    }
  } catch (error) {
    document.querySelectorAll('[data-post-count]').forEach(node => { node.textContent = '—'; });
    lists.forEach(target => showError(target, `文章加载失败：${error.message}`, () => renderPostLists(true)));
  } finally {
    lists.forEach(target => target.removeAttribute('aria-busy'));
    contentRendered();
  }
}

renderPostLists();
