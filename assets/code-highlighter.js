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

const buttonStyle = 'position:absolute;top:8px;right:10px;left:auto;bottom:auto;z-index:5;height:24px;padding:0 10px;border:1px solid rgba(102,204,255,.35);border-radius:999px;background:rgba(21,28,41,.78);color:#b6c7dc;font:700 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(8px);';
const codeStyle = 'display:block;padding:0;white-space:normal;line-height:1.2;tab-size:4;background:transparent;color:#bcbec4;';
const lineStyle = 'display:grid;grid-template-columns:3.8em minmax(0,max-content);min-width:max-content;line-height:1.2;min-height:1.2em;';
const lnStyle = 'display:block;padding:0 1em 0 0;text-align:right;color:#66707d;user-select:none;border-right:1px solid rgba(102,204,255,.16);background:linear-gradient(90deg,rgba(43,45,48,.38),rgba(43,45,48,.14));font-variant-numeric:tabular-nums;';
const srcStyle = 'display:block;padding:0 22px;white-space:pre;';

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
  return lines.map((line, i) => `<span class="code-line" style="${lineStyle}"><span class="code-ln" style="${lnStyle}">${i + 1}</span><span class="code-src" style="${srcStyle}">${line || '&#8203;'}</span></span>`).join('');
}

function addCopy(pre, raw) {
  if (pre.querySelector('.copy-code-btn')) return;
  pre.classList.add('has-copy');
  pre.style.position = 'relative';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-code-btn';
  btn.textContent = 'COPY';
  btn.setAttribute('style', buttonStyle);
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
  code.setAttribute('style', codeStyle);
}

function enhance(root = document) {
  root.querySelectorAll('pre code').forEach(code => enhanceCodeBlock(code));
}

const observer = new MutationObserver(() => enhance());
observer.observe(document.documentElement, { childList: true, subtree: true });
enhance();
