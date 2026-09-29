import { renderMarkdown } from './markdown-renderer.js?v=1.0';
import { enhanceCodeBlocks } from './code-blocks.js?v=1.0';

const POST_BASE = '/posts/';
const IMAGE_CONFIG = '/config/images.json';
const MATHJAX_SRC = '/assets/vendor/mathjax/3.2.2/es5/tex-chtml.js';
let mathJaxLoadPromise = null;

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
      const timer = setTimeout(() => finish(new Error('MathJax load timed out')), 15000);
      const finish = error => {
        clearTimeout(timer);
        script.removeEventListener('load', done);
        script.removeEventListener('error', failed);
        error ? reject(error) : resolve();
      };
      const done = () => {
        waitFor(() => window.MathJax && typeof window.MathJax.typesetPromise === 'function', 'MathJax')
          .then(() => finish(), finish);
      };
      const failed = () => finish(new Error('MathJax script failed to load'));
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', failed, { once: true });
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

function parseMetaValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, '');
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

async function renderArticle() {
  const root = document.querySelector('[data-post-view]');
  if (!root) return;
  const file = new URLSearchParams(location.search).get('file');
  if (!file || !file.endsWith('.md') || file.includes('/') || file.startsWith('_')) {
    root.replaceChildren(el('article', 'render-body', 'Not found'));
    return;
  }

  try {
    await waitFor(() => window.marked && typeof window.marked.parse === 'function', 'marked');

    const res = await fetch(POST_BASE + encodeURIComponent(file), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Markdown ${res.status}`);
    const post = parsePost(file, await res.text());
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
    body.innerHTML = renderMarkdown(post.body, window.marked);
    const headings = collectHeadings(body);
    const toc = buildToc(headings);

    const layout = el('div', 'render-layout');
    layout.append(body, toc);
    root.replaceChildren(back, header, layout);

    enhanceCodeBlocks(body);
    bindTocState(toc, headings);
    bindTocTooltips(toc);
    if (body.querySelector('.math-source')) {
      try {
        await loadMathJax();
        await window.MathJax.typesetPromise([body]);
      } catch (error) {
        console.warn('公式渲染暂不可用，保留文章和公式源码。', error);
        const notice = el('p', 'render-notice', '公式暂未加载成功，正文和代码仍可阅读。刷新页面可重试。');
        notice.setAttribute('role', 'status');
        body.prepend(notice);
      }
      const refreshMathOverflow = () => updateMathOverflow(body);
      requestAnimationFrame(() => {
        refreshMathOverflow();
        requestAnimationFrame(refreshMathOverflow);
      });
      addEventListener('resize', refreshMathOverflow, { passive: true });
    }
    hydrateTocTooltips(toc, headings);
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
