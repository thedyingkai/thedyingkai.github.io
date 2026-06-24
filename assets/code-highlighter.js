import { codeToHtml } from 'https://esm.sh/shiki@1.29.2';

const clionDark = {
  name: 'clion-dark-icls',
  type: 'dark',
  colors: {
    'editor.background': '#1e1f22',
    'editor.foreground': '#bcbec4'
  },
  tokenColors: [
    { scope: ['source'], settings: { foreground: '#bcbec4' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#44ff00' } },
    { scope: ['comment.block.documentation'], settings: { foreground: '#5f826b', fontStyle: 'italic' } },
    { scope: ['keyword.control', 'keyword.other', 'storage.type', 'storage.modifier', 'storage.class', 'storage.struct'], settings: { foreground: '#cf8e6d' } },
    { scope: ['keyword.operator', 'keyword.operator.assignment', 'keyword.operator.arithmetic', 'keyword.operator.comparison', 'keyword.operator.logical', 'punctuation', 'punctuation.separator', 'punctuation.terminator', 'punctuation.section', 'meta.brace'], settings: { foreground: '#bcbec4' } },
    { scope: ['string', 'string.quoted', 'string.quoted.double', 'string.quoted.single'], settings: { foreground: '#6aab73' } },
    { scope: ['constant.character.escape'], settings: { foreground: '#cf8e6d' } },
    { scope: ['constant.numeric'], settings: { foreground: '#2aacb8' } },
    { scope: ['constant.language', 'constant.other', 'variable.other.constant'], settings: { foreground: '#c77dbb' } },
    { scope: ['entity.name.function', 'meta.function.definition entity.name.function'], settings: { foreground: '#56a8f5' } },
    { scope: ['support.function', 'variable.function'], settings: { foreground: '#57aaf7' } },
    { scope: ['variable.other.member', 'variable.other.property', 'meta.field.declaration entity.name.variable'], settings: { foreground: '#c77dbb' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'storage.type.primitive'], settings: { foreground: '#bcbec4' } },
    { scope: ['meta.preprocessor', 'keyword.control.directive', 'entity.name.function.preprocessor'], settings: { foreground: '#b3ae60' } },
    { scope: ['string.quoted.other.lt-gt.include'], settings: { foreground: '#6aab73' } },
    { scope: ['invalid', 'invalid.illegal'], settings: { foreground: '#f75464' } }
  ]
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function detectLang(code) {
  const cls = code.className || '';
  const m = /language-([^\s]+)/.exec(cls);
  if (m) {
    const lang = m[1].toLowerCase();
    if (lang === 'c++' || lang === 'c') return 'cpp';
    return lang;
  }
  const src = code.dataset.rawCode || code.textContent || '';
  if (/#\s*include|using\s+namespace\s+std|bits\/stdc\+\+/.test(src)) return 'cpp';
  return 'cpp';
}

function codeInner(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.querySelector('code')?.innerHTML || '';
}

function lineHtml(inner) {
  const lines = inner.replace(/\n$/, '').split('\n');
  return lines.map((line, i) => `<span class="code-line"><span class="code-ln">${i + 1}</span><span class="code-src">${line || '&#8203;'}</span></span>`).join('');
}

function addCopy(pre, raw) {
  if (pre.querySelector('.copy-code-btn')) return;
  pre.classList.add('has-copy');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-code-btn';
  btn.textContent = 'COPY';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(raw);
      btn.textContent = 'COPIED';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.textContent = 'COPY';
        btn.classList.remove('is-copied');
      }, 1200);
    } catch {
      btn.textContent = 'FAIL';
      setTimeout(() => btn.textContent = 'COPY', 1200);
    }
  });
  pre.append(btn);
}

function fallback(code, raw) {
  code.innerHTML = lineHtml(esc(raw));
  code.classList.add('shiki-code', 'line-numbered-code');
}

async function enhanceCodeBlock(code) {
  if (code.dataset.shikiEnhanced === '1') return;
  const pre = code.closest('pre');
  if (!pre) return;

  const raw = code.dataset.rawCode || code.textContent || '';
  code.dataset.rawCode = raw;
  addCopy(pre, raw);

  const lang = detectLang(code);
  try {
    const html = await codeToHtml(raw, { lang, theme: clionDark });
    const inner = codeInner(html);
    code.innerHTML = lineHtml(inner || esc(raw));
  } catch {
    fallback(code, raw);
  }

  code.dataset.shikiEnhanced = '1';
  code.classList.add('shiki-code', 'line-numbered-code', `language-${lang}`);
  code.style.display = 'block';
  code.style.padding = '0';
  code.style.whiteSpace = 'normal';
  code.style.lineHeight = '1.2';
}

function enhance(root = document) {
  root.querySelectorAll('pre code').forEach(code => enhanceCodeBlock(code));
}

const observer = new MutationObserver(() => enhance());
observer.observe(document.documentElement, { childList: true, subtree: true });
enhance();
