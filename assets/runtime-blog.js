const REPO = 'thedyingkai/thedyingkai.github.io';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${REPO}/contents/posts?ref=${BRANCH}`;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function parsePost(file, text) {
  let data = {}, body = text;
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---\n', 4);
    if (end >= 0) {
      for (const line of text.slice(4, end).split('\n')) {
        const p = line.indexOf(':');
        if (p < 0) continue;
        const key = line.slice(0, p).trim();
        let val = line.slice(p + 1).trim().replace(/^['"]|['"]$/g, '');
        if (val.startsWith('[') && val.endsWith(']')) val = val.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
        data[key] = val;
      }
      body = text.slice(end + 5);
    }
  }
  const stem = file.replace(/\.md$/i, '');
  const heading = body.match(/^#{1,6}\s+(.+)$/m)?.[1]?.replace(/[*_`$\\{}]/g, '').trim();
  const firstText = body.split('\n').map(x => x.replace(/[#*_`>$\\{}]/g, '').trim()).find(Boolean);
  return {file, slug: stem, title: data.title || heading || stem, description: data.description || firstText || stem, date: data.date || 'Post', tags: Array.isArray(data.tags) ? data.tags : ['笔记'], body};
}

async function loadPosts() {
  const res = await fetch(API, {headers: {'Accept': 'application/vnd.github+json'}, cache: 'no-store'});
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const files = (await res.json()).filter(x => x.type === 'file' && /\.md$/i.test(x.name) && !x.name.startsWith('_'));
  const posts = await Promise.all(files.map(async f => parsePost(f.name, await (await fetch(f.download_url, {cache:'no-store'})).text())));
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.file.localeCompare(b.file));
  return posts;
}

function card(p) {
  return `<a class="card" href="/blog/post/?file=${encodeURIComponent(p.file)}"><div class="card__meta"><span>${esc(p.date)}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></a>`;
}

async function renderLists() {
  const targets = [...document.querySelectorAll('[data-post-list]')];
  const counts = [...document.querySelectorAll('[data-post-count]')];
  if (!targets.length && !counts.length) return;
  try {
    const posts = await loadPosts();
    counts.forEach(x => x.textContent = posts.length);
    targets.forEach(x => x.innerHTML = posts.map(card).join('') || '<div class="card"><div class="card__meta"><span>Empty</span></div><h3>暂无文章</h3><p>把 Markdown 文件放进 posts 目录后，这里会自动更新。</p></div>');
  } catch (e) {
    targets.forEach(x => x.innerHTML = `<div class="card"><h3>文章加载失败</h3><p>${esc(e.message)}</p></div>`);
  }
}

function fixLatex(src, inline = false) {
  let x = src
    .replace(/\\_/g, '_')
    .replace(/\\\*/g, '*')
    .replace(/\\begin\{align\\\*\}/g, '\\begin{aligned}')
    .replace(/\\end\{align\\\*\}/g, '\\end{aligned}')
    .replace(/\\begin\{align\*\}/g, '\\begin{aligned}')
    .replace(/\\end\{align\*\}/g, '\\end{aligned}')
    .replace(/\\newline/g, '\\\\');
  if (inline) x = x.replace(/\\dfrac/g, '\\tfrac').replace(/\\frac/g, '\\tfrac');
  return x;
}

function normalizeMath(text) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map(part => {
    if (part.startsWith('```')) return part;
    return part
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, x) => `$$${fixLatex(x, false)}$$`)
      .replace(/\$(?!\$)([^$\n]+?)\$/g, (_, x) => `$${fixLatex(x, true)}$`);
  }).join('');
}

const cppKeywords = new Set('alignas alignof and asm auto bool break case catch char class const constexpr continue decltype default delete do double else enum explicit extern false float for friend if inline int long namespace new nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef typename using virtual void volatile while vector string map set queue priority_queue pair'.split(' '));
function liteHighlight(raw, lang) {
  const isCpp = ['cpp','c++','c','cc','hpp'].includes(lang);
  const out = [];
  const rx = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#\s*include\b[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b)/g;
  let last = 0, m;
  while ((m = rx.exec(raw))) {
    out.push(esc(raw.slice(last, m.index)));
    const s = m[0];
    if (s.startsWith('//') || s.startsWith('/*')) out.push(`<span class="tok-comment">${esc(s)}</span>`);
    else if (s.startsWith('#')) out.push(`<span class="tok-meta">${esc(s)}</span>`);
    else if (s.startsWith('"') || s.startsWith("'")) out.push(`<span class="tok-string">${esc(s)}</span>`);
    else if (/^\d/.test(s)) out.push(`<span class="tok-number">${esc(s)}</span>`);
    else if (isCpp && cppKeywords.has(s)) out.push(`<span class="tok-keyword">${esc(s)}</span>`);
    else out.push(esc(s));
    last = rx.lastIndex;
  }
  out.push(esc(raw.slice(last)));
  return out.join('');
}

async function renderer() {
  const MarkdownIt = (await import('https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/+esm')).default;
  const md = new MarkdownIt({html:true, linkify:true, typographer:true});
  try {
    const katex = (await import('https://cdn.jsdelivr.net/npm/markdown-it-katex@2.0.3/+esm')).default;
    md.use(katex, {throwOnError:false, errorColor:'#d33'});
  } catch {}
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const rawLang = (token.info || 'text').trim().split(/\s+/)[0] || 'text';
    const lang = rawLang.toLowerCase();
    const code = liteHighlight(token.content, lang);
    return `<div class="code-card"><div class="code-card__bar"><span class="code-card__lang">${esc(rawLang)}</span><span class="code-card__hint">scroll</span></div><pre><code class="language-${esc(lang)}">${code}</code></pre></div>`;
  };
  return md;
}

async function renderPost() {
  const mount = document.querySelector('[data-post-view]');
  if (!mount) return;
  const file = new URLSearchParams(location.search).get('file');
  if (!file || !/\.md$/i.test(file) || file.includes('/') || file.startsWith('_')) {
    mount.innerHTML = '<article class="render-body"><h1>文章不存在</h1><p>缺少合法的 file 参数。</p></article>';
    return;
  }
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/posts/${encodeURIComponent(file)}`, {cache:'no-store'});
    if (!res.ok) throw new Error(`Markdown ${res.status}`);
    const raw = await res.text();
    const post = parsePost(file, raw);
    document.title = `${post.title} · thedyingkai`;
    const md = await renderer();
    mount.innerHTML = `<a class="back" href="/blog/">← 返回文章列表</a><header class="render-head"><span class="eyebrow">${esc(post.date)}</span><h1>${esc(post.title)}</h1><p class="render-desc">${esc(post.description)}</p><div class="render-meta">${post.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div><div class="render-actions"><a class="btn" href="https://github.com/${REPO}/blob/${BRANCH}/posts/${encodeURIComponent(file)}">查看原文文件</a></div></header><article class="render-body">${md.render(normalizeMath(post.body))}</article>`;
  } catch (e) {
    mount.innerHTML = `<article class="render-body"><h1>文章加载失败</h1><p>${esc(e.message)}</p></article>`;
  }
}

renderLists();
renderPost();
