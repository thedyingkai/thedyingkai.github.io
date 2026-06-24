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

function lintMarkdownMath(markdown) {
  const errors = [];
  let line = 1;
  let i = 0;
  while (i < markdown.length) {
    if (markdown.slice(i, i + 3) === '```') {
      const end = markdown.indexOf('```', i + 3);
      const chunk = end < 0 ? markdown.slice(i) : markdown.slice(i, end + 3);
      line += (chunk.match(/\n/g) || []).length;
      if (end < 0) break;
      i = end + 3;
      continue;
    }

    if (markdown.startsWith('\\[', i)) errors.push([line, '禁止使用 \\[...\\]，请改成 $...$ 或 $$...$$。']);
    if (markdown.startsWith('\\(', i)) errors.push([line, '禁止使用 \\(...\\)，请改成 $...$。']);
    if (markdown[i] === '$') {
      const end = markdown.indexOf('$', i + 1);
      if (end < 0) errors.push([line, '发现未闭合的 $...$ 数学公式。']);
      else i = end;
    }
    if (markdown[i] === '\n') line++;
    i++;
  }
  if (errors.length) {
    const detail = errors.slice(0, 10).map(([ln, msg]) => `第 ${ln} 行：${msg}`).join('\n');
    throw new Error(`Markdown 数学写法不规范：\n${detail}`);
  }
}

function collectFenceLanguages(markdown) {
  const langs = [];
  const re = /^```\s*([^\s`]*)/gm;
  let match;
  while ((match = re.exec(markdown))) {
    const lang = (match[1] || '').trim().toLowerCase();
    if (lang === 'c++' || lang === 'c') langs.push('cpp');
    else langs.push(lang || 'cpp');
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
    const lang = languages[index] || 'cpp';
    const normalized = lang === 'c++' || lang === 'c' ? 'cpp' : lang;
    code.dataset.rawCode = code.textContent;
    code.classList.add(`language-${normalized}`);
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

    const response = await fetch(RAW_POST_BASE + encodeURIComponent(fileName), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Markdown ${response.status}`);

    parsePost(fileName, await response.text());
    lintMarkdownMath(postBody);
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
    await window.MathJax.typesetPromise([body]);
    markCodeBlocks(body, codeLanguages);
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
