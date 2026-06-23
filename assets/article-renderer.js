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

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function wrap(cls, text) {
  return `<span class="${cls}">${esc(text)}</span>`;
}

const CPP_KEYWORDS = new Set('alignas alignof asm break case catch class concept const constexpr consteval constinit continue co_await co_return co_yield decltype default delete do else enum explicit export extern for friend goto if inline mutable namespace new noexcept operator private protected public register requires return sizeof static static_assert struct switch template this thread_local throw try typedef typename union using virtual volatile while'.split(' '));
const CPP_TYPES = new Set('auto void bool char char8_t char16_t char32_t wchar_t short int long signed unsigned float double size_t ptrdiff_t string i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 ll ull pii pll vi vll vector pair tuple array map set multiset unordered_map unordered_set priority_queue queue stack deque bitset complex'.split(' '));
const CPP_CONSTANTS = new Set('true false nullptr NULL nullopt cin cout cerr clog endl INF LINF MOD mod EPS PI N M YES NO Yes No yes no'.split(' '));
const CPP_OPERATORS = new Set(['>>=','<<=','->*','...','++','--','->','==','!=','<=','>=','&&','||','+=','-=','*=','/=','%=','&=','|=','^=','<<','>>','::','<=>']);

function isIdentStart(ch) {
  return /[A-Za-z_]/.test(ch || '');
}

function isIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch || '');
}

function isLineStartOrSpaceOnly(src, pos) {
  let i = pos - 1;
  while (i >= 0 && src[i] !== '\n') {
    if (src[i] !== ' ' && src[i] !== '\t') return false;
    i--;
  }
  return true;
}

function nextNonSpace(src, pos) {
  let i = pos;
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

function readWhile(src, pos, pred) {
  let i = pos;
  while (i < src.length && pred(src[i])) i++;
  return i;
}

function readString(src, pos, quote) {
  let i = pos + 1;
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2;
      continue;
    }
    if (src[i] === quote) return i + 1;
    i++;
  }
  return i;
}

function readNumber(src, pos) {
  const m = /^(?:0[xX][0-9A-Fa-f']+|0[bB][01']+|(?:\d[\d']*\.?[\d']*|\.\d[\d']*)(?:[eE][+-]?\d[\d']*)?)(?:[uUlLfF]*)/.exec(src.slice(pos));
  return m ? pos + m[0].length : pos + 1;
}

function readOperator(src, pos) {
  for (const op of CPP_OPERATORS) {
    if (src.startsWith(op, pos)) return pos + op.length;
  }
  return pos + 1;
}

function highlightCpp(source) {
  let out = '';
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const two = source.slice(i, i + 2);

    if (ch === '#' && isLineStartOrSpaceOnly(source, i)) {
      const end = source.indexOf('\n', i);
      const j = end < 0 ? source.length : end;
      const line = source.slice(i, j);
      const m = /^(#\s*[A-Za-z_][A-Za-z0-9_]*)([\s\S]*)$/.exec(line);
      out += m ? wrap('jt-meta', m[1]) + wrap('jt-preproc', m[2]) : wrap('jt-meta', line);
      i = j;
      continue;
    }

    if (two === '//') {
      const end = source.indexOf('\n', i);
      const j = end < 0 ? source.length : end;
      out += wrap('jt-comment', source.slice(i, j));
      i = j;
      continue;
    }

    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const j = end < 0 ? source.length : end + 2;
      out += wrap('jt-comment', source.slice(i, j));
      i = j;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const j = readString(source, i, ch);
      out += wrap(ch === '"' ? 'jt-string' : 'jt-char', source.slice(i, j));
      i = j;
      continue;
    }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(source[i + 1] || ''))) {
      const j = readNumber(source, i);
      out += wrap('jt-number', source.slice(i, j));
      i = j;
      continue;
    }

    if (isIdentStart(ch)) {
      const j = readWhile(source, i, isIdentPart);
      const word = source.slice(i, j);
      const k = nextNonSpace(source, j);
      const prev = i > 0 ? source[i - 1] : '';
      let cls = 'jt-ident';

      if (CPP_KEYWORDS.has(word)) cls = 'jt-keyword';
      else if (CPP_TYPES.has(word)) cls = 'jt-type';
      else if (CPP_CONSTANTS.has(word) || /^[A-Z][A-Z0-9_]{1,}$/.test(word)) cls = 'jt-constant';
      else if (source.slice(k, k + 1) === '(' && prev !== '#') cls = 'jt-function';
      else if (source.slice(k, k + 2) === '::') cls = 'jt-type';

      out += wrap(cls, word);
      i = j;
      continue;
    }

    if ('+-*/%=!<>&|^~?:.'.includes(ch) || CPP_OPERATORS.has(two)) {
      const j = readOperator(source, i);
      out += wrap('jt-operator', source.slice(i, j));
      i = j;
      continue;
    }

    if ('(){}[];,'.includes(ch)) {
      out += wrap('jt-punctuation', ch);
      i++;
      continue;
    }

    out += esc(ch);
    i++;
  }

  return out;
}

function prismLanguage(lang) {
  if (!window.Prism || !window.Prism.languages) return null;
  if (lang === 'cpp' || lang === 'c++') return window.Prism.languages.cpp;
  if (lang === 'c') return window.Prism.languages.c;
  return window.Prism.languages[lang] || null;
}

function highlightCodeBlocks(root, languages) {
  root.querySelectorAll('pre code').forEach((code, index) => {
    const source = code.textContent;
    const lang = languages[index] || 'cpp';

    if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
      code.innerHTML = highlightCpp(source);
      code.classList.add('language-cpp');
      code.classList.add('jetbrains-code');
      return;
    }

    try {
      const grammar = prismLanguage(lang);
      if (grammar && window.Prism && typeof window.Prism.highlight === 'function') {
        code.innerHTML = window.Prism.highlight(source, grammar, lang);
        code.classList.add('language-' + lang);
        code.classList.add('prism-code');
        return;
      }
    } catch {}

    try {
      if (!window.hljs || typeof window.hljs.highlight !== 'function') return;
      const result = window.hljs.getLanguage && window.hljs.getLanguage(lang)
        ? window.hljs.highlight(source, { language: lang })
        : window.hljs.highlightAuto(source);
      code.innerHTML = result.value;
      code.classList.add('hljs');
      code.classList.add(`language-${result.language || lang || 'text'}`);
    } catch {
      try {
        window.hljs.highlightElement(code);
      } catch {}
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
