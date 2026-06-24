(() => {
  function fixEscapedLatexInMath(text) {
    return text.split('\\_').join('_').split('\\*').join('*');
  }

  function normalizeSegment(text) {
    return text
      .replace(/\\\(([^\n]*?)\\\)/g, (_, body) => `$${fixEscapedLatexInMath(body)}$`)
      .replace(/\\\[([^\n]*?)\\\]((?:_\{[^}]+\}|_[A-Za-z0-9]+)?)/g, (_, body, suffix) => {
        const b = fixEscapedLatexInMath(body);
        if (b.length <= 24) return `$[${b}]${suffix || ''}$`;
        return `$$${b}$$${suffix || ''}`;
      })
      .replace(/\$([A-Za-z][A-Za-z0-9_{}^\\]*)\\(?=\s|$|[，。,.；;、)])/g, (_, body) => `$${fixEscapedLatexInMath(body)}$`);
  }

  function normalizeMarkdownMath(markdown) {
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
      const next = markdown.indexOf('```', i);
      const end = next < 0 ? markdown.length : next;
      out += normalizeSegment(markdown.slice(i, end));
      i = end;
    }
    return out;
  }

  function patchTexMe() {
    if (!window.texme || typeof window.texme.render !== 'function') {
      setTimeout(patchTexMe, 20);
      return;
    }
    if (window.texme.__mathNormalizerPatched) return;
    const rawRender = window.texme.render.bind(window.texme);
    window.texme.render = (markdown, ...args) => rawRender(normalizeMarkdownMath(markdown), ...args);
    window.texme.__mathNormalizerPatched = true;
  }

  patchTexMe();
})();
