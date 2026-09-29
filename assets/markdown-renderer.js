// Let Markdown recognize code before recognizing math. TexMe's global masking
// also unmasked dollar expressions inside code as raw HTML (e.g. "$<tag>$").
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const configured = new WeakSet();

function mathToken(source, block = false) {
  const patterns = [
    /^\$\$(?:[^\\]|\\[\s\S])*?\$\$/,
    /^\\\[[\s\S]*?\\\]/,
    /^\\begin\{([^}]+)\}[\s\S]*?\\end\{\1\}/
  ];
  if (!block) patterns.push(/^\\\([\s\S]*?\\\)/, /^\$(?!\s|\$)(?:[^$\\\n]|\\.)*?[^\s\\]\$(?!\$)/, /^\$[^\s$\\]\$(?!\$)/);
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match) return { type: block ? 'mathBlock' : 'mathInline', raw: match[0], text: match[0] };
  }
}

export function renderMarkdown(source, marked) {
  if (!configured.has(marked)) {
    marked.use({ extensions: [
      {
        name: 'mathBlock', level: 'block',
        start: source => source.match(/\$\$|\\\[|\\begin\{/)?.index,
        tokenizer: source => mathToken(source, true),
        renderer: token => `<div class="math-source">${escapeHtml(token.text)}</div>\n`
      },
      {
        name: 'mathInline', level: 'inline',
        start: source => source.match(/\$|\\\(|\\\[|\\begin\{/)?.index,
        tokenizer: source => mathToken(source),
        renderer: token => `<span class="math-source">${escapeHtml(token.text)}</span>`
      }
    ] });
    configured.add(marked);
  }
  return marked.parse(source);
}
