import { element as el } from './lib/dom.js?v=1.0';

export function collectHeadings(body) {
  return [...body.querySelectorAll('h1, h2, h3, h4')].flatMap((node, index) => {
    const text = node.textContent.trim();
    if (!text) return [];
    const slug = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    node.id = `${slug || 'section'}-${index + 1}`;
    return [{ id: node.id, level: Number(node.tagName.slice(1)), node }];
  });
}

function headingContent(heading) {
  const clone = heading.cloneNode(true);
  clone.querySelectorAll('a').forEach(link => link.replaceWith(...link.childNodes));
  clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  return [...clone.childNodes];
}

export function buildToc(items) {
  const toc = el('aside', 'render-toc');
  toc.setAttribute('aria-label', '文章目录');
  toc.append(el('p', 'render-toc__title', '目录'));
  const nav = el('nav');
  for (const item of items) {
    const link = el('a', `render-toc__link render-toc__link--${item.level}`);
    link.href = `#${item.id}`;
    link.dataset.target = item.id;
    const label = el('span', 'render-toc__label');
    label.classList.toggle('render-toc__label--math', !!item.node.querySelector('.math-source'));
    // Keep the source intact. MathJax typesets these nodes with the article.
    label.append(...headingContent(item.node));
    link.append(label);
    nav.append(link);
  }
  if (!items.length) nav.append(el('span', 'render-toc__empty', '暂无小节'));
  toc.append(nav);
  return toc;
}

export function bindToc(toc, items, body) {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const links = [...toc.querySelectorAll('[data-target]')];
  const tip = el('div', 'render-toc-tip');
  tip.hidden = true;
  tip.setAttribute('aria-hidden', 'true'); // The focused link already exposes its full heading.
  document.body.append(tip);
  let hideTimer;
  let frame = 0;
  let positions = [];
  let active = -1;

  const hide = () => { tip.hidden = true; clearTimeout(hideTimer); };
  const delayedHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 120); };
  const show = link => {
    clearTimeout(hideTimer);
    const label = link.firstElementChild;
    if (label.scrollWidth <= label.clientWidth + 1) { hide(); return; }
    tip.replaceChildren(...headingContent(label));
    tip.querySelectorAll('[tabindex]').forEach(node => { node.tabIndex = -1; });
    tip.hidden = false;
    const rect = link.getBoundingClientRect();
    const gap = 12;
    const width = tip.offsetWidth;
    let left = rect.left - width - gap;
    if (left < gap) left = rect.right + gap;
    tip.style.left = `${Math.max(gap, Math.min(left, innerWidth - width - gap))}px`;
    tip.style.top = `${Math.max(gap, Math.min(rect.top, innerHeight - tip.offsetHeight - gap))}px`;
  };
  links.forEach(link => {
    link.addEventListener('mouseenter', () => show(link), { signal });
    link.addEventListener('mouseleave', delayedHide, { signal });
    link.addEventListener('focus', () => show(link), { signal });
    link.addEventListener('blur', hide, { signal });
    link.addEventListener('click', hide, { signal });
  });
  tip.addEventListener('mouseenter', () => clearTimeout(hideTimer), { signal });
  tip.addEventListener('mouseleave', delayedHide, { signal });
  addEventListener('keydown', event => { if (event.key === 'Escape') hide(); }, { signal });

  const update = () => {
    frame = 0;
    let next = 0;
    const offset = scrollY + 110;
    for (let i = 0; i < positions.length && positions[i] <= offset; i++) next = i;
    if (next === active) return;
    active = next;
    links.forEach((link, index) => {
      link.classList.toggle('is-active', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const refresh = () => {
    positions = items.map(item => item.node.getBoundingClientRect().top + scrollY);
    schedule();
  };
  addEventListener('scroll', () => { hide(); schedule(); }, { passive: true, signal });
  addEventListener('resize', () => { hide(); refresh(); }, { passive: true, signal });
  addEventListener('tdk:content-rendered', refresh, { signal });
  const observer = new ResizeObserver(refresh);
  observer.observe(body);
  refresh();
  return () => { lifetime.abort(); observer.disconnect(); cancelAnimationFrame(frame); hide(); tip.remove(); };
}
