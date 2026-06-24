(() => {
  function normalizeLanguage(code) {
    const rawClass = code.className || '';
    const match = /language-([^\s]+)/.exec(rawClass);
    const lang = match ? match[1].toLowerCase() : 'cpp';
    const normalized = lang === 'c++' || lang === 'c' ? 'cpp' : lang;
    code.classList.remove('language-c++', 'language-c', 'language-cc');
    code.classList.add(`language-${normalized}`);
    const pre = code.closest('pre');
    if (pre) {
      pre.classList.remove('language-c++', 'language-c', 'language-cc');
      pre.classList.add(`language-${normalized}`, 'line-numbers');
    }
  }

  function addCopy(pre, raw) {
    if (pre.querySelector('.copy-code-btn')) return;
    pre.classList.add('has-copy');
    pre.style.position = 'relative';
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

  function enhanceCodeBlock(code) {
    if (code.dataset.prismEnhanced === '1') return;
    const pre = code.closest('pre');
    if (!pre) return;

    const raw = code.dataset.rawCode || code.textContent || '';
    code.dataset.rawCode = raw;
    code.textContent = raw;
    normalizeLanguage(code);
    addCopy(pre, raw);

    if (window.Prism) window.Prism.highlightElement(code);
    code.dataset.prismEnhanced = '1';
  }

  function enhance(root = document) {
    if (!window.Prism) return;
    root.querySelectorAll('pre code').forEach(enhanceCodeBlock);
  }

  function start() {
    if (window.Prism) window.Prism.manual = true;
    enhance();
    new MutationObserver(() => enhance()).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (window.Prism) start();
  else window.addEventListener('load', start, { once: true });
})();
