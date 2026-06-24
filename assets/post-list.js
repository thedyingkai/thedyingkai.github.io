// Post list renderer for homepage and /blog/.
//
// This file only builds article cards. It does not render Markdown content.
// Article content is rendered by assets/article-renderer.js on /blog/post/.

const POST_REPO = 'thedyingkai/thedyingkai.github.io';
const POST_BRANCH = 'main';
const POST_API = `https://api.github.com/repos/${POST_REPO}/contents/posts?ref=${POST_BRANCH}`;
const POST_BASE = '/posts/';
const POST_MANIFEST = '/config/posts.json';
const IMAGE_CONFIG = '/config/images.json';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function parsePostSummary(fileName, rawText) {
  let meta = {};
  const normalized = rawText.replace(/\r\n?/g, '\n');
  let body = normalized;

  if (normalized.startsWith('---\n')) {
    const end = normalized.indexOf('\n---\n', 4);
    if (end >= 0) {
      for (const line of normalized.slice(4, end).split('\n')) {
        const pos = line.indexOf(':');
        if (pos < 0) continue;
        const key = line.slice(0, pos).trim();
        let value = line.slice(pos + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
        } else {
          value = value.replace(/^["']|["']$/g, '');
        }
        meta[key] = value;
      }
      body = normalized.slice(end + 5);
    }
  }

  const slug = fileName.replace(/\.md$/i, '');
  const heading = body.match(/^#{1,6}\s+(.+)$/m)?.[1]?.replace(/[*_`$\\{}]/g, '').trim();
  const firstText = body.split('\n').map(x => x.replace(/[#*_`>$\\{}]/g, '').trim()).find(Boolean);

  return {
    fileName,
    title: meta.title || heading || slug,
    description: meta.description || firstText || slug,
    date: meta.date || 'Post',
    tags: Array.isArray(meta.tags) ? meta.tags : ['笔记'],
    cover: meta.cover || meta.image || '',
    coverAlt: meta.coverAlt || meta.cover_alt || meta.imageAlt || ''
  };
}

function resolveImageSrc(src, basePath) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (/^(?:https?:)?\/\//.test(raw) || raw.startsWith('/')) return raw;
  return `${basePath || ''}${raw}`;
}

function normalizeText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('zh-CN');
}

function postSearchText(post) {
  return normalizeText([post.title, post.description, post.date, ...(post.tags || [])].join(' '));
}

async function loadCoverBasePath() {
  const response = await fetch(`${IMAGE_CONFIG}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`images.json ${response.status}`);
  const cfg = await response.json();
  return cfg.basePath || '';
}

function postCard(post, options = {}) {
  const tags = post.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const cover = options.withCover ? resolveImageSrc(post.cover, options.coverBasePath) : '';
  const thumb = cover ? `<div class="post-card__thumb"><img src="${escapeHtml(cover)}" alt="${escapeHtml(post.coverAlt || post.title)}" loading="lazy"></div>` : '';
  return `<a class="card card--post${cover ? ' card--with-image' : ''}" href="/blog/post/?file=${encodeURIComponent(post.fileName)}">${thumb}<div class="card__meta"><span>${escapeHtml(post.date)}</span></div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.description)}</p><div class="tags">${tags}</div></a>`;
}

async function loadLocalPostFiles() {
  const response = await fetch(`${POST_MANIFEST}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`posts.json ${response.status}`);
  const manifest = await response.json();
  const files = Array.isArray(manifest) ? manifest : manifest.files;
  return (files || []).filter(name => typeof name === 'string' && name.endsWith('.md') && !name.includes('/') && !name.startsWith('_'));
}

async function loadPostsFromLocalFiles(files) {
  return Promise.all(files.map(async fileName => {
    const response = await fetch(`${POST_BASE}${encodeURIComponent(fileName)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${fileName} ${response.status}`);
    return parsePostSummary(fileName, await response.text());
  }));
}

async function loadPostsFromGithub() {
  const response = await fetch(POST_API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);

  const files = (await response.json()).filter(item => item.type === 'file' && item.name.endsWith('.md') && !item.name.startsWith('_'));
  const posts = await Promise.all(files.map(async file => {
    const raw = await (await fetch(file.download_url, { cache: 'no-store' })).text();
    return parsePostSummary(file.name, raw);
  }));

  return posts;
}

async function loadPosts() {
  let posts;
  try {
    const files = await loadLocalPostFiles();
    posts = await loadPostsFromLocalFiles(files);
  } catch {
    posts = await loadPostsFromGithub();
  }

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.fileName.localeCompare(b.fileName));
  return posts;
}

function uniqueTags(posts) {
  return [...new Set(posts.flatMap(post => post.tags || []))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function setupPostTools(posts, target, options) {
  const tools = document.querySelector('[data-post-tools]');
  if (!tools) return false;

  const input = tools.querySelector('[data-post-search]');
  const tagList = tools.querySelector('[data-post-tags]');
  const count = tools.querySelector('[data-post-result-count]');
  const empty = '<div class="card"><h3>没有匹配文章</h3><p>换个关键词或标签试试。</p></div>';
  const selectedTags = new Set();

  tools.hidden = false;
  if (tagList) {
    tagList.innerHTML = uniqueTags(posts).map(tag => `<button class="tag-filter" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('');
    tagList.addEventListener('click', event => {
      const button = event.target.closest('[data-tag]');
      if (!button) return;
      const tag = button.dataset.tag;
      selectedTags.has(tag) ? selectedTags.delete(tag) : selectedTags.add(tag);
      button.classList.toggle('is-active', selectedTags.has(tag));
      render();
    });
  }

  const render = () => {
    const query = normalizeText(input?.value || '');
    const filtered = posts.filter(post => {
      const matchQuery = !query || postSearchText(post).includes(query);
      const matchTags = !selectedTags.size || [...selectedTags].every(tag => (post.tags || []).includes(tag));
      return matchQuery && matchTags;
    });
    target.innerHTML = filtered.map(post => postCard(post, options)).join('') || empty;
    if (count) count.textContent = `${filtered.length} / ${posts.length} 篇`;
  };

  input?.addEventListener('input', render);
  render();
  return true;
}

async function renderPostLists() {
  if (!document.querySelector('[data-post-list], [data-post-count]')) return;

  const countTargets = [...document.querySelectorAll('[data-post-count]')];
  const listTargets = [...document.querySelectorAll('[data-post-list]')];

  try {
    const posts = await loadPosts();
    const needsCoverBasePath = listTargets.some(target => target.dataset.postList === 'blog') && posts.some(post => post.cover);
    const coverBasePath = needsCoverBasePath ? await loadCoverBasePath().catch(() => '/assets/images/anime/') : '';
    countTargets.forEach(target => target.textContent = posts.length);
    listTargets.forEach(target => {
      const withCover = target.dataset.postList === 'blog';
      const options = { withCover, coverBasePath };
      if (withCover && setupPostTools(posts, target, options)) return;
      target.innerHTML = posts.map(post => postCard(post, options)).join('') || '<div class="card"><h3>暂无文章</h3><p>之后再慢慢补。</p></div>';
    });
  } catch (error) {
    listTargets.forEach(target => {
      target.innerHTML = `<div class="card"><h3>文章加载失败</h3><p>${escapeHtml(error.message)}</p></div>`;
    });
  }
}

renderPostLists();
