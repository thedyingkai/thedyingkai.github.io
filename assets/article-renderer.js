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

function fixEscapedLatexInMath(text) {
  return text.split('\\_').join('_').split('\\*').join('*').trim();
}

function isShortInlineMath(body) {
  const s = body.trim();
  if (s.length > 80) return false;
  if (/\\begin|\\end|\\\\|\\sum|\\prod|\\int|\\frac\s*\{/.test(s)) return false;
  return true;
}

function readEscapedMath(markdown, start, open, close) {
  const end = markdown.indexOf(close, start + open.length);
  if (end < 0) return null;
  const body = fixEscapedLatexInMath(markdown.slice(start + open.length, end));
  let pos = end + close.length;
  let suffix = '';
  if (markdown[pos] === '\\' && markdown[pos + 1] === '_') {
    suffix += '_';
    pos += 2;
    if (markdown[pos] === '{') {
      const closeBrace = markdown.indexOf('}', pos + 1);
      if (closeBrace >= 0) {
        suffix += markdown.slice(pos, closeBrace + 1);
        pos = closeBrace + 1;
      }
    } else {
      while (/[A-Za-z0-9]/.test(markdown[pos] || '')) suffix += markdown[pos++];
    }
  } else if (markdown[pos] === '_') {
    suffix += markdown[pos++];
    if (markdown[pos] === '{') {
      const closeBrace = markdown.indexOf('}', pos + 1);
      if (closeBrace >= 0) {
        suffix += markdown.slice(pos, closeBrace + 1);
        pos = closeBrace + 1;
      }
    } else {
      while (/[A-Za-z0-9]/.test(markdown[pos] || '')) suffix += markdown[pos++];
    }
  }
  if (open === '\\[' && isShortInlineMath(body)) return { text: `$[${body}]${suffix}$`, pos };
  if (open === '\\[') return { text: `$$${body}$$`, pos };
  return { text: `$${body}$`, pos };
}

function readDollarMath(markdown, start) {
  const end = markdown.indexOf('$', start + 1);
  if (end >= 0) {
    const body = fixEscapedLatexInMath(markdown.slice(start + 1, end));
    return { text: `$${body}$`, pos: end + 1 };
  }

  let pos = start + 1;
  while (pos < markdown.length && !/[\n，。,.；;、)）\s]/.test(markdown[pos])) pos++;
  let body = markdown.slice(start + 1, pos);
  body = body.replace(/\\+$/, '');
  if (/^[A-Za-z0-9_{}^\\]+$/.test(body)) return { text: `$${fixEscapedLatexInMath(body)}$`, pos };
  return { text: markdown[start], pos: start + 1 };
}

function normalizeMathSegment(markdown) {
  let out = '';
  let i = 0;
  while (i < markdown.length) {
    if (markdown.startsWith('\\[', i)) {
      const res = readEscapedMath(markdown, i, '\\[', '\\]');
      if (res) {
        out += res.text;
        i = res.pos;
        continue;
      }
    }
    if (markdown.startsWith('\\(', i)) {
      const res = readEscapedMath(markdown, i, '\\(', '\\)');
      if (res) {
        out += res.text;
        i = res.pos;
        continue;
      }
    }
    if (markdown[i] === '$') {
      const res = readDollarMath(markdown, i);
      out += res.text;
      i = res.pos;
      continue;
    }
    out += markdown[i++];
  }
  return out;
}

function normalizeMathOnly(markdown) {
  let out = '';
  let i = 0;
  while (i < markdown.length) {
    if (markdown.slice(i, i + 3) === '```') {
      const end = markdown.indexOf('```', i + 3);
      if (end < 0) {
        out += markdown.slice(i);
        break;
      }
      out += markdown.slice(i, end + 3);
      i = end + 3;
      continue;
    }
    const nextFence = markdown.indexOf('```', i);
    const end = nextFence < 0 ? markdown.length : nextFence;
    out += normalizeMathSegment(markdown.slice(i, end));
    i = end;
  }
  return out;
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
    body.innerHTML = window.texme.render(normalizeMathOnly(postBody));

    root.replaceChildren(back, header, body);
    await window.MathJax.typesetPromise([body]);
    markCodeBlocks(body, codeLanguages);
  } catch (error) {
    const box = element('article', 'render-body');
    box.append(element('h1', '', '文章加载失败'));
    box.append(element('p', '', error.message));
    root.replaceChildren(box);
  }
}

renderArticle();
