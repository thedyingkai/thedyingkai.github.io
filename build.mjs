import fs from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import katex from 'markdown-it-katex';

const root = process.cwd();
const postsDir = path.join(root, 'posts');
const blogDir = path.join(root, 'blog');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => s.replace(/\.(md|typ)$/i, '');

function typToMd(s){
  return s.replace(/^====\s+(.+)$/gm,'#### $1')
    .replace(/^===\s+(.+)$/gm,'### $1')
    .replace(/^==\s+(.+)$/gm,'## $1')
    .replace(/^=\s+(.+)$/gm,'# $1')
    .replace(/#image\("([^"]+)"\)/g,'![]($1)')
    .replace(/#link\("([^"]+)"\)\[([^\]]+)\]/g,'[$2]($1)');
}

const md = new MarkdownIt({
  html:true,
  linkify:true,
  typographer:true,
  highlight(code, lang){
    const l = esc(lang || 'text');
    return `<div class="code-card"><div class="code-card__bar"><span class="code-card__lang">${l}</span></div><pre><code class="language-${l}">${esc(code)}</code></pre></div>`;
  }
}).use(katex,{throwOnError:false,errorColor:'#cc0000'});

function page(title, body, raw){
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · thedyingkai</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/post-renderer.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"></head><body><div class="progress"></div><main class="render-shell"><a class="back" href="/blog/">← 返回文章列表</a><header class="render-head"><h1>${esc(title)}</h1><div class="render-actions"><a class="btn" href="${esc(raw)}">查看原文文件</a></div></header><article class="render-body">${body}</article></main><script src="/assets/site.js"></script></body></html>`;
}

const files = (await fs.readdir(postsDir)).filter(f => f.endsWith('.md') || f.endsWith('.typ'));
let cards = '';
for(const file of files){
  const raw = await fs.readFile(path.join(postsDir, file), 'utf8');
  const text = file.endsWith('.typ') ? typToMd(raw) : raw;
  const title = text.match(/^#\s+(.+)$/m)?.[1] || slug(file);
  const out = path.join(blogDir, slug(file));
  await fs.mkdir(out, {recursive:true});
  await fs.writeFile(path.join(out, 'index.html'), page(title, md.render(text), `/posts/${file}`));
  cards += `<a class="card" href="/blog/${slug(file)}/"><h3>${esc(title)}</h3><p>由 ${esc(file)} 自动生成。</p></a>`;
}
await fs.writeFile(path.join(blogDir, 'index.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文章 · thedyingkai</title><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/post-renderer.css"></head><body><main><section class="page-head wrap"><h1>文章</h1><p>文章由 posts/*.md / posts/*.typ 自动生成。</p></section><section class="article-list wrap"><div class="grid grid--3">${cards}</div></section></main></body></html>`);
console.log('built '+files.length+' posts');
