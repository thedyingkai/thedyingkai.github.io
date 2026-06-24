(() => {
  function normalizeLanguage(code) {
    const m = /language-([^\s]+)/.exec(code.className || '');
    const lang = m ? m[1].toLowerCase() : 'cpp';
    const normalized = lang === 'c++' || lang === 'c' || lang === 'cc' ? 'cpp' : lang;
    code.className = code.className.replace(/language-(c\+\+|c|cc|cpp)\b/g, '').trim();
    code.classList.add(`language-${normalized}`);
  }

  function highlight(code) {
    if (code.dataset.highlighted === 'yes') return;
    code.textContent = code.dataset.rawCode || code.textContent || '';
    normalizeLanguage(code);
    if (window.hljs) window.hljs.highlightElement(code);
  }

  function highlightAll(root = document) {
    if (!window.hljs) return;
    root.querySelectorAll('pre code').forEach(highlight);
  }

  window.addEventListener('load', () => highlightAll(), { once: true });
  new MutationObserver(() => highlightAll()).observe(document.documentElement, { childList: true, subtree: true });
})();
