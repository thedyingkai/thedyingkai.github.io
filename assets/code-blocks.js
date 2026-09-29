import { copyText as copyCode } from './lib/clipboard.js?v=1.0';
export { copyCode };

const aliases = { 'c++': 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp', py: 'python', python3: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', text: 'plaintext', txt: 'plaintext', plain: 'plaintext', none: 'plaintext' };
const labels = { cpp: 'C++', c: 'C', java: 'Java', python: 'Python', bash: 'Bash', plaintext: '纯文本' };
export const normalizeLanguage = value => aliases[value.toLowerCase()] || value.toLowerCase();

// highlight.js tokens can span multiple lines. Close/reopen those spans so
// every visual row owns both its number and its (possibly wrapped) content.
export function splitHighlightedLines(html) {
  const lines = [];
  const stack = [];
  let line = '';
  for (const part of html.split(/(\n|<\/?span\b[^>]*>)/g)) {
    if (part === '\n') {
      lines.push(line + '</span>'.repeat(stack.length));
      line = stack.join('');
    } else {
      line += part;
      if (part.startsWith('<span')) stack.push(part);
      else if (part === '</span>') stack.pop();
    }
  }
  lines.push(line + '</span>'.repeat(stack.length));
  return lines;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

export function enhanceCodeBlocks(root, highlighter = window.hljs) {
  const lifetime = new AbortController();
  const timers = new Set();
  const { signal } = lifetime;
  root.querySelectorAll('pre > code').forEach((code, index) => {
    if (code.dataset.codeEnhanced) return;
    const pre = code.parentElement;
    const raw = code.textContent.replace(/\r\n?/g, '\n');
    const languageClass = [...code.classList].find(name => /^(language|lang)-/.test(name));
    const language = normalizeLanguage(languageClass?.replace(/^(language|lang)-/, '') || 'plaintext');
    const displayed = raw.endsWith('\n') ? raw.slice(0, -1) : raw;
    const escaped = node('span', '', displayed);
    let html = escaped.innerHTML;
    if (language !== 'plaintext' && highlighter?.getLanguage(language)) {
      try { html = highlighter.highlight(displayed, { language, ignoreIllegals: true }).value; }
      catch { /* A broken/missing grammar must not hide the code. */ }
    }
    const lines = splitHighlightedLines(html);
    code.replaceChildren();
    lines.forEach((content, i) => {
      const line = node('span', 'code-line');
      const number = node('span', 'code-line-number');
      number.dataset.line = String(i + 1);
      number.setAttribute('aria-hidden', 'true');
      const text = node('span', 'code-line-content');
      text.innerHTML = content;
      line.append(number, text);
      code.append(line);
      if (i < lines.length - 1 || raw.endsWith('\n')) code.append('\n');
    });
    code.classList.add('hljs');
    code.dataset.codeEnhanced = '1';
    pre.classList.add('code-pre');

    const frame = node('figure', 'code-frame');
    frame.style.setProperty('--code-gutter', `${Math.max(3, String(lines.length).length + 2)}ch`);
    const toolbar = node('figcaption', 'code-toolbar');
    const label = node('span', 'code-lang', labels[language] || language);
    const count = node('span', 'code-count', `${lines.length} 行`);
    const actions = node('div', 'code-actions');
    const wrap = node('button', 'code-copy', '自动换行');
    wrap.type = 'button';
    wrap.setAttribute('aria-pressed', 'false');
    wrap.addEventListener('click', () => {
      const active = frame.classList.toggle('is-wrapped');
      wrap.setAttribute('aria-pressed', String(active));
    }, { signal });
    const copy = node('button', 'code-copy', '复制');
    copy.type = 'button';
    copy.setAttribute('aria-live', 'polite');
    let timer;
    copy.addEventListener('click', async () => {
      const success = await copyCode(raw);
      if (signal.aborted) return;
      copy.textContent = success ? '已复制' : '复制失败，请手动选择';
      clearTimeout(timer);
      timers.delete(timer);
      timer = setTimeout(() => { timers.delete(timer); copy.textContent = '复制'; }, 2000);
      timers.add(timer);
    }, { signal });
    actions.append(wrap, copy);
    toolbar.append(label, count, actions);
    const scroller = node('div', 'code-scroller');
    scroller.tabIndex = 0;
    scroller.setAttribute('role', 'region');
    scroller.setAttribute('aria-label', `代码块 ${index + 1}，${labels[language] || language}，${lines.length} 行`);
    pre.before(frame);
    scroller.append(pre);
    frame.append(toolbar, scroller);
  });
  return () => {
    lifetime.abort();
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
  };
}
