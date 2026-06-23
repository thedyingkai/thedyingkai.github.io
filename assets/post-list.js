// Post list renderer for homepage and /blog/.
//
// This file only builds article cards. It does not render Markdown content.
// Article content is rendered by assets/article-renderer.js on /blog/post/.

const POST_REPO = 'thedyingkai/thedyingkai.github.io';
const POST_BRANCH = 'main';
const POST_API = `https://api.github.com/repos/${POST_REPO}/contents/posts?ref=${POST_BRANCH}`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Extract enough metadata to render a card. Full Markdown rendering is not done here.
function parsePostSummary(fileName, rawText) {
  let meta = {};
  let body = rawText;

  if (rawText.startsWith('---\n')) {
    const end = rawText.indexOf('\n---\n', 4);
    if (end >= 0) {
      for (const line of rawText.slice(4, end).split('\n')) {
        const pos = line.indexOf(':');
        if (pos < 0) continue;
        const key = line.slice(0, pos).trim();
        let value = line.slice(pos + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
        }
        meta[key] = value;
      }
      body = rawText.slice(end + 5);
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
    tags: Array.isArray(meta.tags) ? meta.tags : ['笔记']
  };
}

function postCard(post) {
  const tags = post.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  return `<a class="card" href="/blog/post/?file=${encodeURIComponent(post.fileName)}"><div class="card__meta"><span>${escapeHtml(post.date)}</span></div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.description)}</p><div class="tags">${tags}</div></a>`;
}

async function loadPosts() {
  const response = await fetch(POST_API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);

  const files = (await response.json()).filter(item => item.type === 'file' && item.name.endsWith('.md') && !item.name.startsWith('_'));
  const posts = await Promise.all(files.map(async file => {
    const raw = await (await fetch(file.download_url, { cache: 'no-store' })).text();
    return parsePostSummary(file.name, raw);
  }));

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.fileName.localeCompare(b.fileName));
  return posts;
}

async function renderPostLists() {
  const listTargets = [...document.querySelectorAll('[data-post-list]')];
  const countTargets = [...document.querySelectorAll('[data-post-count]')];
  if (!listTargets.length && !countTargets.length) return;

  try {
    const posts = await loadPosts();
    countTargets.forEach(target => target.textContent = posts.length);
    listTargets.forEach(target => {
      target.innerHTML = posts.map(postCard).join('') || '<div class="card"><h3>暂无文章</h3><p>把 Markdown 文件放进 posts 目录后，这里会自动更新。</p></div>';
    });
  } catch (error) {
    listTargets.forEach(target => {
      target.innerHTML = `<div class="card"><h3>文章加载失败</h3><p>${escapeHtml(error.message)}</p></div>`;
    });
  }
}

renderPostLists();
