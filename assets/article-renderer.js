const POST_BASE = '/posts/';
const IMAGE_CONFIG = '/config/images.json';
const MATHJAX_SRC = '/assets/vendor/mathjax/3.2.2/es5/tex-chtml.js';
const BUSUANZI_SRC = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
let mathJaxLoadPromise = null;

const LANGUAGE_ALIASES = {
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash'
};

const LANGUAGE_LABELS = {
  bash: 'Bash',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  python: 'Python'
};

const CODE_EXTRA_TOKEN_RE = /(\b(?:bool|char|double|float|int|long|short|signed|size_t|string|u?int(?:8|16|32|64)_t|void|wchar_t|ll|ull|i64|u64|i32|u32|pii|pll|vi|vll|vector|pair|tuple|array|map|set|multiset|unordered_map|unordered_set|priority_queue|queue|stack|deque|bitset)\b)|(\b(?:cin|cout|cerr|clog|endl|rep|per|pb|eb|all|rall|sz|abs|acos|asin|atan|atan2|ceil|cos|exp|fabs|floor|log|log10|pow|sin|sqrt|tan|min|max|swap|sort|stable_sort|reverse|unique|lower_bound|upper_bound|binary_search|count|find|fill|memset|memcpy|iota|gcd|lcm|push_back|pop_back|emplace_back|insert|erase|clear|resize|reserve|begin|end|rbegin|rend|front|back|top|pop|push|emplace|make_pair)\b)|(>>=|<<=|->\*|\.{3}|::|->|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|<=>|[+\-*\/%=&|^!~<>?:.])|([()[\]{},;])|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;

function waitFor(fn, name) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        if (fn()) return resolve();
      } catch { }
      if (Date.now() - start > 15000) return reject(new Error(`${name} not ready`));
      setTimeout(tick, 50);
    };
    tick();
  });
}

function loadMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve();
  if (!mathJaxLoadPromise) {
    mathJaxLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${MATHJAX_SRC}"]`);
      const script = existing || document.createElement('script');
      const done = () => {
        waitFor(() => window.MathJax && typeof window.MathJax.typesetPromise === 'function', 'MathJax')
          .then(resolve, reject);
      };
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', reject, { once: true });
      if (!existing) {
        script.defer = true;
        script.src = MATHJAX_SRC;
        document.body.append(script);
      }
    });
  }
  return mathJaxLoadPromise;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function loadBusuanzi() {
  if (
    (!document.getElementById('busuanzi_value_page_pv') &&
      !document.getElementById('busuanzi_value_site_pv') &&
      !document.getElementById('busuanzi_value_site_uv')) ||
    document.querySelector('script[data-busuanzi-loader]')
  ) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = BUSUANZI_SRC;
  script.dataset.busuanziLoader = '1';
  document.body.append(script);
}

function pageViewMeta() {
  const item = el('span', 'render-meta__count');
  const container = document.createElement('span');
  container.id = 'busuanzi_container_page_pv';
  container.append(document.createTextNode('阅读 '));

  const value = document.createElement('span');
  value.id = 'busuanzi_value_page_pv';
  value.textContent = '--';

  container.append(value, document.createTextNode(' 次'));
  item.append(container);
  return item;
}

function parseMetaValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

function hasMathMarkup(value) {
  const text = String(value || '');
  return /\\\(|\\\[|\\begin\{(?:align|array|bmatrix|cases|equation|gather|matrix|pmatrix|split|vmatrix)\}/.test(text) ||
    /(^|[^\\])\$\$[\s\S]+?[^\\]\$\$/.test(text) ||
    /(^|[^\\])\$[^\s$\n](?:[^$\n]{0,240}[^\s\\$])?\$/.test(text);
}

function parsePost(file, raw) {
  const post = { title: file.replace(/\.md$/i, ''), description: '', date: 'Post', tags: ['Note'], cover: '', coverAlt: '', body: raw };
  const normalized = raw.replace(/\r\n?/g, '\n');
  if (normalized.startsWith('---\n')) {
    const end = normalized.indexOf('\n---\n', 4);
    if (end >= 0) {
      for (const line of normalized.slice(4, end).split('\n')) {
        const p = line.indexOf(':');
        if (p < 0) continue;
        const k = line.slice(0, p).trim();
        const v = parseMetaValue(line.slice(p + 1));
        if (k === 'title') post.title = v;
        if (k === 'description') post.description = v;
        if (k === 'date') post.date = v;
        if (k === 'tags' && Array.isArray(v)) post.tags = v;
        if (k === 'cover' || k === 'image') post.cover = v;
        if (k === 'coverAlt' || k === 'cover_alt' || k === 'imageAlt') post.coverAlt = v;
      }
      post.body = normalized.slice(end + 5);
    }
  }
  if (!post.description) post.description = post.title;
  return post;
}

function resolveImageSrc(src, basePath) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (/^(?:https?:)?\/\//.test(raw) || raw.startsWith('/')) return raw;
  return `${basePath || ''}${raw}`;
}

async function loadCoverBasePath() {
  const res = await fetch(`${IMAGE_CONFIG}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`config/images.json ${res.status}`);
  const cfg = await res.json();
  return cfg.basePath || '';
}

function slugifyHeading(text, index) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'section'}-${index + 1}`;
}

function collectHeadings(body) {
  const used = new Set();
  return [...body.querySelectorAll('h1, h2, h3, h4')]
    .map((heading, index) => {
      const text = heading.textContent.trim();
      if (!text) return null;
      let id = slugifyHeading(text, index);
      while (used.has(id)) id = `${id}-${used.size + 1}`;
      used.add(id);
      heading.id = id;
      const clone = heading.cloneNode(true);
      clone.querySelectorAll('a').forEach(a => a.replaceWith(...a.childNodes));
      return { id, text, html: clone.innerHTML, level: Number(heading.tagName.slice(1)), node: heading };
    })
    .filter(Boolean);
}

function buildToc(items) {
  const aside = el('aside', 'render-toc');
  aside.setAttribute('aria-label', '文章目录');
  aside.append(el('p', 'render-toc__title', '目录'));

  const nav = document.createElement('nav');
  if (!items.length) {
    nav.append(el('span', 'render-toc__empty', '暂无小节'));
  } else {
    items.forEach(item => {
      const link = el('a', `render-toc__link render-toc__link--${item.level}`);
      link.href = `#${item.id}`;
      link.textContent = tocLabel(item.text);
      link.setAttribute('aria-label', item.text);
      link.dataset.target = item.id;
      link._tocHtml = item.html;
      nav.append(link);
    });
  }

  aside.append(nav);
  return aside;
}

function latexPlainText(text) {
  return String(text || '')
    .replace(/\$/g, '')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\sum/g, '∑')
    .replace(/\\mu/g, 'μ')
    .replace(/\\varphi|\\phi/g, 'φ')
    .replace(/\\varepsilon|\\epsilon/g, 'ε')
    .replace(/\\iff/g, '↔')
    .replace(/\\cdot/g, '·')
    .replace(/\\left|\\right/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateTocText(text, max = 30) {
  const chars = [...latexPlainText(text)];
  if (chars.length <= max) return chars.join('');
  const head = Math.ceil(max * .68);
  const tail = Math.max(4, max - head - 2);
  return `${chars.slice(0, head).join('')}..${chars.slice(-tail).join('')}`;
}

function tocLabel(text) {
  return truncateTocText(text);
}

function bindTocTooltips(toc) {
  const links = [...toc.querySelectorAll('[data-target]')].filter(link => link._tocHtml);
  if (!links.length) return;

  const tip = el('div', 'render-toc-tip');
  tip.hidden = true;
  document.body.append(tip);

  const place = link => {
    const rect = link.getBoundingClientRect();
    const gap = 12;
    let left = rect.right + gap;
    let top = rect.top - 8;
    if (left + tip.offsetWidth > window.innerWidth - gap) left = Math.max(gap, rect.left - tip.offsetWidth - gap);
    if (top + tip.offsetHeight > window.innerHeight - gap) top = window.innerHeight - tip.offsetHeight - gap;
    tip.style.left = `${Math.max(gap, left)}px`;
    tip.style.top = `${Math.max(gap, top)}px`;
  };

  const show = async link => {
    tip.hidden = false;
    tip.innerHTML = link._tocHtml;
    if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([tip]).catch(() => {});
    updateMathOverflow(tip);
    place(link);
  };

  const hide = () => {
    tip.hidden = true;
    tip.replaceChildren();
  };

  links.forEach(link => {
    link.addEventListener('mouseenter', () => show(link));
    link.addEventListener('focus', () => show(link));
    link.addEventListener('mouseleave', hide);
    link.addEventListener('blur', hide);
  });
  addEventListener('scroll', hide, { passive: true });
}

function hydrateTocTooltips(toc, items) {
  for (const item of items) {
    const link = toc.querySelector(`[data-target="${CSS.escape(item.id)}"]`);
    if (link) link._tocHtml = item.node.innerHTML;
  }
}

function updateMathOverflow(root = document) {
  root.querySelectorAll('mjx-container[display="true"], .render-toc-tip mjx-container').forEach(node => {
    node.classList.remove('is-overflowing');
    const parentWidth = node.parentElement?.clientWidth || node.clientWidth || 0;
    const ownWidth = node.getBoundingClientRect().width;
    const contentWidth = Math.max(
      node.scrollWidth,
      ...[...node.children].map(child => child.getBoundingClientRect().width)
    );
    const sourceLength = (node.getAttribute('data-tex') || node.textContent || '').replace(/\s+/g, '').length;
    const overflowing = parentWidth > 0 && (
      ownWidth > parentWidth + 2 ||
      contentWidth > parentWidth + 2 ||
      sourceLength > 42
    );
    node.classList.toggle('is-overflowing', overflowing);
  });
}

function bindTocState(toc, items) {
  const links = new Map([...toc.querySelectorAll('[data-target]')].map(link => [link.dataset.target, link]));
  if (!links.size || !('IntersectionObserver' in window)) return;

  const visible = new Map();
  const setActive = () => {
    const active = [...visible.entries()]
      .filter(([, entry]) => entry.isIntersecting)
      .sort((a, b) => a[1].boundingClientRect.top - b[1].boundingClientRect.top)[0]?.[0];
    if (!active) return;
    links.forEach(link => link.classList.toggle('is-active', link.dataset.target === active));
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => visible.set(entry.target.id, entry));
    setActive();
  }, { rootMargin: '-18% 0px -70% 0px', threshold: [0, 1] });

  items.forEach(item => observer.observe(item.node));
  links.values().next().value?.classList.add('is-active');
}

function normalizeLanguage(value) {
  const lang = String(value || '').trim().toLowerCase();
  return LANGUAGE_ALIASES[lang] || lang;
}

function detectLanguage(code, raw) {
  for (const cls of code.classList) {
    const match = /^(?:language|lang)-(.+)$/i.exec(cls);
    if (match) return normalizeLanguage(match[1]);
  }
  if (/#\s*include|std::|using\s+namespace\s+std|int\s+main\s*\(/.test(raw)) return 'cpp';
  return '';
}

function resetLanguageClass(code, lang) {
  [...code.classList].forEach(cls => {
    if (/^(?:language|lang)-/i.test(cls)) code.classList.remove(cls);
  });
  if (lang) code.classList.add(`language-${lang}`);
}

function highlightCode(code, raw) {
  const detected = detectLanguage(code, raw);
  const hasLanguage = detected && window.hljs.getLanguage(detected);
  code.removeAttribute('data-highlighted');
  code.textContent = raw;

  if (hasLanguage) {
    resetLanguageClass(code, detected);
    window.hljs.highlightElement(code);
    decorateCodeTokens(code);
    return detected;
  }

  resetLanguageClass(code, '');
  const result = window.hljs.highlightAuto(raw);
  code.innerHTML = result.value;
  code.classList.add('hljs');
  if (result.language) code.classList.add(`language-${result.language}`);
  decorateCodeTokens(code);
  return result.language || '';
}

function shouldSkipExtraToken(node) {
  for (let el = node.parentElement; el && el !== node.ownerDocument.body; el = el.parentElement) {
    if (el.classList?.contains('hljs-comment') ||
      el.classList?.contains('hljs-quote') ||
      el.classList?.contains('hljs-string') ||
      el.classList?.contains('hljs-regexp') ||
      el.classList?.contains('hljs-meta') ||
      el.classList?.contains('hljs-keyword') ||
      el.classList?.contains('hljs-type') ||
      el.classList?.contains('hljs-number') ||
      el.classList?.contains('hljs-title') ||
      el.classList?.contains('hljs-built_in') ||
      el.classList?.contains('hljs-literal') ||
      el.classList?.contains('hljs-variable') ||
      el.classList?.contains('hljs-operator') ||
      el.classList?.contains('hljs-punctuation') ||
      el.classList?.contains('hljs-extra-token')) {
      return true;
    }
    if (el.tagName === 'CODE') return false;
  }
  return false;
}

function extraTokenClass(typeToken, builtInToken, operatorToken, punctuationToken) {
  if (typeToken) return 'hljs-type hljs-extra-token';
  if (builtInToken) return 'hljs-built_in hljs-extra-token';
  if (operatorToken) return 'hljs-operator hljs-extra-token';
  if (punctuationToken) return 'hljs-punctuation hljs-extra-token';
  return 'hljs-variable hljs-extra-token';
}

function decorateTextNode(node) {
  const text = node.nodeValue;
  CODE_EXTRA_TOKEN_RE.lastIndex = 0;
  if (!CODE_EXTRA_TOKEN_RE.test(text)) return;
  CODE_EXTRA_TOKEN_RE.lastIndex = 0;

  const frag = document.createDocumentFragment();
  let last = 0;
  let match;
  while ((match = CODE_EXTRA_TOKEN_RE.exec(text)) !== null) {
    if (match.index > last) frag.append(document.createTextNode(text.slice(last, match.index)));
    const span = document.createElement('span');
    span.className = extraTokenClass(match[1], match[2], match[3], match[4]);
    span.textContent = match[0];
    frag.append(span);
    last = match.index + match[0].length;
  }
  if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
  node.replaceWith(frag);
}

function decorateCodeTokens(code) {
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim() || shouldSkipExtraToken(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(decorateTextNode);
}

function countLines(raw) {
  const normalized = raw.replace(/\r\n?/g, '\n');
  const trimmed = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
  return Math.max(1, trimmed.split('\n').length);
}

function copyText(text, button) {
  const done = () => {
    button.textContent = '已复制';
    button.classList.add('is-copied');
    setTimeout(() => {
      button.textContent = '复制';
      button.classList.remove('is-copied');
    }, 1200);
  };

  const fail = () => {
    button.textContent = '失败';
    setTimeout(() => {
      button.textContent = '复制';
    }, 1200);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fail);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  try {
    document.execCommand('copy') ? done() : fail();
  } catch {
    fail();
  } finally {
    textarea.remove();
  }
}

function enhanceCodeBlocks(root) {
  root.querySelectorAll('pre > code').forEach(code => {
    if (code.dataset.codeEnhanced === '1') return;
    const pre = code.parentElement;
    const raw = code.textContent.replace(/\r\n?/g, '\n');
    const language = highlightCode(code, raw);
    const lines = countLines(raw);

    const frame = el('figure', 'code-frame');
    const toolbar = el('figcaption', 'code-toolbar');
    const label = el('span', 'code-lang', LANGUAGE_LABELS[language] || language || 'Code');
    const button = el('button', 'code-copy', '复制');
    button.type = 'button';
    button.addEventListener('click', () => copyText(raw, button));

    const scroller = el('div', 'code-scroller');
    const gutter = el('div', 'code-gutter');
    gutter.setAttribute('aria-hidden', 'true');
    for (let i = 1; i <= lines; i++) gutter.append(el('span', '', String(i)));

    pre.classList.add('code-pre');
    toolbar.append(label, button);
    scroller.append(gutter);
    pre.parentNode.insertBefore(frame, pre);
    scroller.append(pre);
    frame.append(toolbar, scroller);
    code.dataset.codeEnhanced = '1';
  });
}

async function renderArticle() {
  const root = document.querySelector('[data-post-view]');
  if (!root) return;
  const file = new URLSearchParams(location.search).get('file');
  if (!file || !file.endsWith('.md') || file.includes('/') || file.startsWith('_')) {
    root.replaceChildren(el('article', 'render-body', 'Not found'));
    return;
  }

  try {
    await waitFor(() => window.texme && typeof window.texme.render === 'function', 'texme');
    await waitFor(() => window.marked && typeof window.marked.parse === 'function', 'marked');
    await waitFor(() => window.hljs && typeof window.hljs.highlightElement === 'function', 'highlight.js');

    const res = await fetch(POST_BASE + encodeURIComponent(file), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Markdown ${res.status}`);
    const post = parsePost(file, await res.text());
    const needsMath = hasMathMarkup(post.body);
    if (needsMath) await loadMathJax();
    const coverBasePath = post.cover ? await loadCoverBasePath().catch(() => '/assets/images/anime/') : '';
    const coverSrc = resolveImageSrc(post.cover, coverBasePath);
    document.title = `${post.title} · TDK 的小窝`;

    const back = el('a', 'back', '← 返回文章');
    back.href = '/blog/';

    const header = el('header', 'render-head');
    header.append(el('span', 'eyebrow', post.date));
    header.append(el('h1', '', post.title));
    header.append(el('p', 'render-desc', post.description));
    const meta = el('div', 'render-meta');
    for (const tag of post.tags) meta.append(el('span', '', `#${tag}`));
    meta.append(pageViewMeta());
    header.append(meta);
    if (coverSrc) {
      const cover = el('figure', 'render-cover');
      const img = document.createElement('img');
      img.src = coverSrc;
      img.alt = post.coverAlt || post.title;
      img.loading = 'eager';
      cover.append(img);
      header.append(cover);
    }

    const body = el('article', 'render-body texme-body');
    body.innerHTML = window.texme.render(post.body);
    const headings = collectHeadings(body);
    const toc = buildToc(headings);

    const layout = el('div', 'render-layout');
    layout.append(body, toc);
    root.replaceChildren(back, header, layout);
    loadBusuanzi();

    if (needsMath) {
      await window.MathJax.typesetPromise([body]);
      const refreshMathOverflow = () => updateMathOverflow(body);
      requestAnimationFrame(() => {
        refreshMathOverflow();
        requestAnimationFrame(refreshMathOverflow);
      });
      addEventListener('resize', refreshMathOverflow, { passive: true });
    }
    hydrateTocTooltips(toc, headings);
    enhanceCodeBlocks(body);
    bindTocState(toc, headings);
    bindTocTooltips(toc);
  } catch (e) {
    const box = el('article', 'render-body');
    box.append(el('h1', '', 'Load failed'));
    const pre = el('pre', '', e.message);
    pre.style.whiteSpace = 'pre-wrap';
    box.append(pre);
    root.replaceChildren(box);
  }
}

renderArticle();
