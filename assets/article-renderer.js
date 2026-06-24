// Article renderer for /blog/post/?file=xxx.md

const REPO = 'thedyingkai/thedyingkai.github.io';
const BRANCH = 'main';
const RAW_POST_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/posts/`;

let postTitle = '';
let postDescription = '';
let postDate = 'Post';
let postTags = [];
let postBody = '';

function parsePost(fileName, rawText) {
  postTitle = fileName.replace(/\.md$/i, '');
  postDescription = postTitle;
  postDate = 'Post';
  postTags = ['笔记'];
  postBody = rawText;

  if (rawText.startsWith('---\n')) {
    const end = rawText.indexOf('\n---\n', 4);
    if (end >= 0) {
      const header = rawText.slice(4, end).split('\n');
      for (const line of header) {
        const pos = line.indexOf(':');
        if (pos < 0) continue;
        const key = line.slice(0, pos).trim();
        const value = line.slice(pos + 1).trim();
        if (key === 'title') postTitle = value;
        if (key === 'description') postDescription = value;
        if (key === 'date') postDate = value;
        if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
          postTags = value.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
        }
      }
      postBody = rawText.slice(end + 5);
    }
  }

  if (postTitle === fileName.replace(/\.md$/i, '')) {
    for (const line of postBody.split('\n')) {
      const s = line.trim();
      if (s.startsWith('# ')) {
        postTitle = s.slice(2).trim();
        postDescription ||= postTitle;
        break;
      }
    }
  }
}

function collectFenceLanguages(markdown) {
  const langs = [];
  const re = /^```\s*([^\s`]*)/gm;
  let match;
  while ((match = re.exec(markdown))) {
    const lang = (match[1] || '').trim().toLowerCase();
    langs.push(lang || 'c++');
  }
  return langs;
}

function waitFor(condition, name) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        if (condition()) return resolve();
      } catch {}
      if (Date.now() - start > 15000) return reject(new Error(`${name} not ready`));
      setTimeout(tick, 50);
    };
    tick();
  });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function markCodeBlocks(root, languages) {
  root.querySelectorAll('pre code').forEach((code, index) => {
    const lang = languages[index] || 'c++';
    code.className = `language-${lang}`;
  });
}

async function renderArticle() {
  const root = document.querySelector('[data-post-view]');
  if (!root) return;

  const fileName = new URLSearchParams(location.search).get('file');
  if (!fileName || !fileName.endsWith('.md') || fileName.includes('/') || fileName.startsWith('_')) {
    root.replaceChildren(element('article', 'render-body', '文章不存在'));
    return;
  }

  try {
    await waitFor(() => window.texme && typeof window.texme.render === 'function', 'texme');
    await waitFor(() => window.MathJax && typeof window.MathJax.typesetPromise === 'function', 'MathJax');
    await waitFor(() => window.hljs && typeof window.hljs.highlightAll === 'function', 'highlight.js');

    const response = await fetch(RAW_POST_BASE + encodeURIComponent(fileName), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Markdown ${response.status}`);

    parsePost(fileName, await response.text());
    const codeLanguages = collectFenceLanguages(postBody);
    document.title = `${postTitle} · thedyingkai`;

    const back = element('a', 'back', '← 返回文章列表');
    back.href = '/blog/';

    const header = element('header', 'render-head');
    header.append(element('span', 'eyebrow', postDate));
    header.append(element('h1', '', postTitle));
    header.append(element('p', 'render-desc', postDescription));

    const meta = element('div', 'render-meta');
    for (const tag of postTags) meta.append(element('span', '', `#${tag}`));
    header.append(meta);

    const body = element('article', 'render-body texme-body');
    body.innerHTML = window.texme.render(postBody);

    root.replaceChildren(back, header, body);
    markCodeBlocks(body, codeLanguages);
    await window.MathJax.typesetPromise([body]);
    window.hljs.highlightAll();
  } catch (error) {
    const box = element('article', 'render-body');
    box.append(element('h1', '', '文章加载失败'));
    const pre = element('pre', '', error.message);
    pre.style.whiteSpace = 'pre-wrap';
    box.append(pre);
    root.replaceChildren(box);
  }
}

renderArticle();
