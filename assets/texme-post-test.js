const R='thedyingkai/thedyingkai.github.io';
const B='main';
const RAW='https://raw.githubusercontent.com/'+R+'/'+B+'/posts/';
let T='',D='',DATE='Post',TAGS=[],BODY='';
function parse(file,text){
  T=file.slice(0,-3);D=T;DATE='Post';TAGS=['笔记'];BODY=text;
  if(text.slice(0,4)==='---\n'){
    let end=text.indexOf('\n---\n',4);
    if(end>=0){
      let lines=text.slice(4,end).split('\n');
      for(let line of lines){
        let p=line.indexOf(':');
        if(p<0)continue;
        let k=line.slice(0,p).trim();
        let v=line.slice(p+1).trim();
        if(k==='title')T=v;
        if(k==='description')D=v;
        if(k==='date')DATE=v;
        if(k==='tags'){
          if(v[0]==='['&&v[v.length-1]===']')TAGS=v.slice(1,-1).split(',').map(x=>x.trim()).filter(Boolean);
        }
      }
      BODY=text.slice(end+5);
    }
  }
  if(T===file.slice(0,-3)){
    for(let line of BODY.split('\n')){
      let s=line.trim();
      if(s.slice(0,2)==='# '){T=s.slice(2).trim();D=D||T;break;}
    }
  }
}
function fixEsc(s){return s.split('\\_').join('_').split('\\*').join('*')}
function fixMath(src){
  let out='',i=0;
  while(i<src.length){
    if(src.slice(i,i+3)==='```'){
      let j=src.indexOf('```',i+3);if(j<0){out+=src.slice(i);break}out+=src.slice(i,j+3);i=j+3;continue;
    }
    if(src.slice(i,i+2)==='$$'){
      let j=src.indexOf('$$',i+2);if(j<0){out+=src.slice(i);break}out+='$$'+fixEsc(src.slice(i+2,j))+'$$';i=j+2;continue;
    }
    if(src[i]==='$'){
      let j=src.indexOf('$',i+1);if(j<0){out+=src[i++];continue}out+='$'+fixEsc(src.slice(i+1,j))+'$';i=j+1;continue;
    }
    out+=src[i++];
  }
  return out;
}
function wait(fn,name){let st=Date.now();return new Promise((ok,fail)=>{let go=()=>{try{if(fn())return ok()}catch(e){}if(Date.now()-st>15000)return fail(new Error(name+' not ready'));setTimeout(go,50)};go()})}
function el(t,c,x){let e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
async function main(){
  let root=document.querySelector('[data-post-view]');if(!root)return;
  let file=new URLSearchParams(location.search).get('file');
  if(!file||!file.endsWith('.md')||file.includes('/')||file[0]==='_'){root.replaceChildren(el('article','render-body','文章不存在'));return}
  try{
    await wait(()=>window.texme&&typeof window.texme.render==='function'&&typeof window.texme.render('x')==='string','texme');
    await wait(()=>window.MathJax&&typeof window.MathJax.typesetPromise==='function','MathJax');
    let res=await fetch(RAW+encodeURIComponent(file));if(!res.ok)throw new Error('Markdown '+res.status);
    parse(file,await res.text());document.title=T+' · thedyingkai';
    let back=el('a','back','← 返回文章列表');back.href='/blog/';
    let head=el('header','render-head');head.append(el('span','eyebrow',DATE));head.append(el('h1','',T));head.append(el('p','render-desc',D));
    let ms=el('div','render-meta');for(let tag of TAGS)ms.append(el('span','','#'+tag));head.append(ms);
    let body=el('article','render-body texme-body');body.innerHTML=window.texme.render(fixMath(BODY));
    root.replaceChildren(back,head,body);await window.MathJax.typesetPromise([body]);if(window.hljs)body.querySelectorAll('pre code').forEach(x=>window.hljs.highlightElement(x));
  }catch(e){let box=el('article','render-body');box.append(el('h1','','文章加载失败'));box.append(el('p','',e.message));root.replaceChildren(box)}
}
main();
