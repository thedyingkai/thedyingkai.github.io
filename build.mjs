import fs from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import footnote from 'markdown-it-footnote';
import katex from 'markdown-it-katex';

const root = process.cwd();
const postsDir = path.join(root, 'posts');
const blogDir = path.join(root, 'blog');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => s.replace(/\.md$/i, '');
const presets = {
  'about-me': ['关于', '个人介绍与成长记录', 'About', ['About','成长记录']],
  'tree-templates': ['树状数组线段树', '树状数组与线段树模板', '2025.08.04', ['数据结构','板子','笔记']],
  'generating-functions': ['生成函数', '普通生成函数、指数生成函数、狄利克雷生成函数与卷积', '2025.08.02', ['数学','数论','笔记']],
  'fibonacci': ['斐波那契数列', '斐波那契性质、求法与齐肯多夫定理', '2025.07.31', ['数学','数论','笔记']],
  'fast-power': ['快速幂杂谈', '快速幂、逆元、矩阵快速幂与扩展理解', '2025.07.31', ['快速幂','数学','数论']],
  'cf-1034-div3': ['Codeforces-1034-Div.3 题解', 'Codeforces Round 1034 Div.3 A-G 题解', '2025.07.03', ['Codeforces','Div3','题解']],
  'abc404': ['ABC 404', 'AtCoder ABC 404 题解', '2025.06.28', ['ABC','AtCoder','题解']]
};

function meta(src){
  if(!src.startsWith('---\n')) return [{}, src];
  const end = src.indexOf('\n---\n', 4);
  if(end < 0) return [{}, src];
  const data = {};
  for(const line of src.slice(4, end).split('\n')){
    const p = line.indexOf(':');
    if(p < 0) continue;
    const key = line.slice(0, p).trim();
    let val = line.slice(p + 1).trim();
    if(val.startsWith('[') && val.endsWith(']')) val = val.slice(1, -1).split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    else val = val.replace(/^['"]|['"]$/g, '');
    data[key] = val;
  }
  return [data, src.slice(end + 5)];
}
function info(file, data, text){
  const id = slug(file);
  const p = presets[id] || [];
  const title = data.title || p[0] || text.match(/^#\s+(.+)$/m)?.[1] || id;
  const description = data.description || p[1] || text.replace(/[#*_`>\[\]$]/g,'').split('\n').find(x=>x.trim()) || title;
  const date = data.date || p[2] || 'Post';
  const tags = Array.isArray(data.tags) ? data.tags : (p[3] || ['笔记']);
  return {id, title, description, date, tags};
}
const md = new MarkdownIt({
  html:true, linkify:true, typographer:true,
  highlight(code, lang){
    const l = esc(lang || 'text');
    return `<div class="code-card"><div class="code-card__bar"><span class="code-card__lang">${l}</span><span class="code-card__hint">scroll</span></div><pre><code class="language-${l}">${esc(code)}</code></pre></div>`;
  }
}).use(anchor,{slugify:s=>String(s).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'')}).use(footnote).use(katex,{throwOnError:false,errorColor:'#d33'});
function shell({title, description, date, tags, body, raw}){
  const tagHtml = tags.map(t=>`<span>#${esc(t)}</span>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(description)}"><title>${esc(title)} · thedyingkai</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/post-renderer.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"></head><body><div class="progress"></div><header class="topbar"><div class="wrap topbar__inner"><a class="brand" href="/"><span class="brand__mark">thedyingkai<span class="brand__dot">.</span></span><span class="brand__sub">Notebook</span></a><nav class="nav"><a href="/">首页</a><a class="is-active" href="/blog/">文章</a><a href="/projects/">项目</a><a href="/about/">关于</a></nav></div></header><main class="render-shell"><a class="back" href="/blog/">← 返回文章列表</a><header class="render-head"><span class="eyebrow">${esc(date)}</span><h1>${esc(title)}</h1><p class="render-desc">${esc(description)}</p><div class="render-meta">${tagHtml}</div><div class="render-actions"><a class="btn" href="${esc(raw)}">查看原文文件</a></div></header><article class="render-body">${body}</article></main><footer class="footer"><div class="wrap footer__inner"><span>© 2026 thedyingkai.</span><span><a href="/blog/">Blog</a></span></div></footer><script src="/assets/site.js"></script></body></html>`;
}
const files = (await fs.readdir(postsDir)).filter(f => f.endsWith('.md') && !f.startsWith('_'));
const posts = [];
for(const file of files){
  const raw = await fs.readFile(path.join(postsDir,file),'utf8');
  const [data, content] = meta(raw);
  const item = info(file, data, content);
  const out = path.join(blogDir, item.id);
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,'index.html'), shell({...item, body:md.render(content), raw:`/posts/${file}`}));
  posts.push(item);
}
posts.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
const cards = posts.map(p=>`<a class="card" href="/blog/${esc(p.id)}/"><div class="card__meta"><span>${esc(p.date)}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="tags">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></a>`).join('');
await fs.writeFile(path.join(blogDir,'index.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文章 · thedyingkai</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/post-renderer.css"></head><body><div class="progress"></div><header class="topbar"><div class="wrap topbar__inner"><a class="brand" href="/"><span class="brand__mark">thedyingkai<span class="brand__dot">.</span></span><span class="brand__sub">Notebook</span></a><nav class="nav"><a href="/">首页</a><a class="is-active" href="/blog/">文章</a><a href="/projects/">项目</a><a href="/about/">关于</a></nav></div></header><main><section class="page-head wrap"><span class="eyebrow">Archive</span><h1>文章</h1><p>直接把 Markdown 文件放进 posts 目录即可生成文章页；标题、简介和标签会自动推断，必要时再用 frontmatter 覆盖。</p></section><section class="article-list wrap"><div class="grid grid--3">${cards}</div></section></main><footer class="footer"><div class="wrap footer__inner"><span>© 2026 thedyingkai.</span><span>${posts.length} posts</span></div></footer><script src="/assets/site.js"></script></body></html>`);
console.log('built '+posts.length+' posts');
