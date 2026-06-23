// Article renderer for /blog/post/?file=xxx.md
//
// The page itself is static. This script loads one Markdown file from posts/,
// renders Markdown with TexMe, then lets MathJax typeset LaTeX and highlight.js
// highlight code blocks. It intentionally does not implement a Markdown parser.

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
  return text.split('\\_').join('_').split('\\*').join('*');
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

    if (markdown.slice(i, i + 2) === '$$') {
      const end = markdown.indexOf('$$', i + 2);
      if (end < 0) {
        out += markdown.slice(i);
        break;
      }
      out += '$$' + fixEscapedLatexInMath(markdown.slice(i + 2, end)) + '$$';
      i = end + 2;
      continue;
    }

    if (markdown[i] === '$') {
      const end = markdown.indexOf('$', i + 1);
      if (end < 0) {
        out += markdown[i++];
        continue;
      }
      out += '$' + fixEscapedLatexInMath(markdown.slice(i + 1, end)) + '$';
      i = end + 1;
      continue;
    }

    out += markdown[i++];
  }

  return out;
}

// TexMe/marked may drop the language class from fenced code blocks.
// Record fence languages from the original Markdown and re-attach them after render.
function collectFenceLanguages(markdown) {
  const langs = [];
  const re = /^```\s*([^\s`]*)/gm;
  let match;
  while ((match = re.exec(markdown))) {
    const lang = (match[1] || '').trim().toLowerCase();
    langs.push(lang === 'c++' ? 'cpp' : lang);
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

function highlightCodeBlocks(root, languages) {
  if (!window.hljs) return;
  root.querySelectorAll('pre code').forEach((code, index) => {
    const source = code.textContent;
    const lang = languages[index] || '';
    try {
      const result = lang && window.hljs.getLanguage(lang)
        ? window.hljs.highlight(source, { language: lang })
        : window.hljs.highlightAuto(source, ['cpp', 'c', 'javascript', 'json', 'bash', 'xml', 'css']);
      code.innerHTML = result.value;
      code.classList.add('hljs');
      code.classList.add(`language-${result.language || lang || 'text'}`);
    } catch {
      window.hljs.highlightElement(code);
    }
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
    highlightCodeBlocks(body, codeLanguages);
  } catch (error) {
    const box = element('article', 'render-body');
    box.append(element('h1', '', '文章加载失败'));
    box.append(element('p', '', error.message));
    root.replaceChildren(box);
  }
}

renderArticle();
