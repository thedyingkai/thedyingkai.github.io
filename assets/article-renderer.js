const REPO='thedyingkai/thedyingkai.github.io';
const RAW_POST_BASE=`https://raw.githubusercontent.com/${REPO}/main/posts/`;

function waitFor(fn,name){
  const start=Date.now();
  return new Promise((resolve,reject)=>{
    const tick=()=>{
      try{if(fn())return resolve();}catch{}
      if(Date.now()-start>15000)return reject(new Error(name+' not ready'));
      setTimeout(tick,50);
    };
    tick();
  });
}

function el(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!=null)node.textContent=text;
  return node;
}

function parsePost(file,raw){
  const post={title:file.replace(/\.md$/i,''),description:'',date:'Post',tags:['Note'],body:raw};
  if(raw.startsWith('---\n')){
    const end=raw.indexOf('\n---\n',4);
    if(end>=0){
      for(const line of raw.slice(4,end).split('\n')){
        const p=line.indexOf(':');
        if(p<0)continue;
        const k=line.slice(0,p).trim();
        const v=line.slice(p+1).trim();
        if(k==='title')post.title=v;
        if(k==='description')post.description=v;
        if(k==='date')post.date=v;
        if(k==='tags'&&v.startsWith('[')&&v.endsWith(']'))post.tags=v.slice(1,-1).split(',').map(x=>x.trim()).filter(Boolean);
      }
      post.body=raw.slice(end+5);
    }
  }
  if(!post.description)post.description=post.title;
  return post;
}

async function renderArticle(){
  const root=document.querySelector('[data-post-view]');
  if(!root)return;
  const file=new URLSearchParams(location.search).get('file');
  if(!file||!file.endsWith('.md')||file.includes('/')||file.startsWith('_')){
    root.replaceChildren(el('article','render-body','Not found'));
    return;
  }
  try{
    await waitFor(()=>window.texme&&typeof window.texme.render==='function','texme');
    await waitFor(()=>window.MathJax&&typeof window.MathJax.typesetPromise==='function','MathJax');
    await waitFor(()=>window.hljs&&typeof window.hljs.highlightAll==='function','highlight.js');
    const res=await fetch(RAW_POST_BASE+encodeURIComponent(file),{cache:'no-store'});
    if(!res.ok)throw new Error('Markdown '+res.status);
    const post=parsePost(file,await res.text());
    document.title=post.title+' · thedyingkai';
    const back=el('a','back','← Back');
    back.href='/blog/';
    const header=el('header','render-head');
    header.append(el('span','eyebrow',post.date));
    header.append(el('h1','',post.title));
    header.append(el('p','render-desc',post.description));
    const meta=el('div','render-meta');
    for(const tag of post.tags)meta.append(el('span','',`#${tag}`));
    header.append(meta);
    const body=el('article','render-body texme-body');
    body.innerHTML=window.texme.render(post.body);
    root.replaceChildren(back,header,body);
    await window.MathJax.typesetPromise([body]);
    window.hljs.highlightAll();
  }catch(e){
    const box=el('article','render-body');
    box.append(el('h1','','Load failed'));
    const pre=el('pre','',e.message);
    pre.style.whiteSpace='pre-wrap';
    box.append(pre);
    root.replaceChildren(box);
  }
}

renderArticle();
