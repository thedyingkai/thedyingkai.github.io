import { codeToTokens } from 'https://esm.sh/shiki@1.29.2';

const theme={name:'clion-dark-icls',type:'dark',colors:{'editor.background':'#1e1f22','editor.foreground':'#bcbec4'},tokenColors:[
{scope:['source'],settings:{foreground:'#bcbec4'}},
{scope:['comment','punctuation.definition.comment'],settings:{foreground:'#44ff00'}},
{scope:['comment.block.documentation'],settings:{foreground:'#5f826b',fontStyle:'italic'}},
{scope:['keyword','keyword.control','keyword.other','storage','storage.type','storage.modifier','storage.class','storage.struct','storage.type.auto.cpp','storage.type.specifier.auto.cpp'],settings:{foreground:'#cf8e6d'}},
{scope:['keyword.operator','keyword.operator.assignment','keyword.operator.arithmetic','keyword.operator.comparison','keyword.operator.logical','punctuation','punctuation.separator','punctuation.terminator','punctuation.section','meta.brace'],settings:{foreground:'#bcbec4'}},
{scope:['string','string.quoted','string.quoted.double','string.quoted.single'],settings:{foreground:'#6aab73'}},
{scope:['constant.character.escape'],settings:{foreground:'#cf8e6d'}},
{scope:['constant.numeric'],settings:{foreground:'#2aacb8'}},
{scope:['constant.language','constant.other','variable.other.constant'],settings:{foreground:'#c77dbb'}},
{scope:['entity.name.function','meta.function.definition entity.name.function'],settings:{foreground:'#56a8f5'}},
{scope:['support.function','variable.function'],settings:{foreground:'#57aaf7'}},
{scope:['variable.other.member','variable.other.property','meta.field.declaration entity.name.variable'],settings:{foreground:'#c77dbb'}},
{scope:['entity.name.type','entity.name.class','support.type','support.class'],settings:{foreground:'#bcbec4'}},
{scope:['meta.preprocessor','keyword.control.directive','entity.name.function.preprocessor'],settings:{foreground:'#b3ae60'}},
{scope:['string.quoted.other.lt-gt.include'],settings:{foreground:'#6aab73'}},
{scope:['invalid','invalid.illegal'],settings:{foreground:'#f75464'}}]};

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btnStyle='position:absolute;top:8px;right:10px;left:auto;bottom:auto;z-index:5;height:24px;padding:0 10px;border:1px solid rgba(102,204,255,.35);border-radius:999px;background:rgba(21,28,41,.78);color:#b6c7dc;font:700 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(8px);';
const codeStyle='display:block;padding:0;white-space:normal;line-height:1.2;tab-size:4;background:transparent;color:#bcbec4;';
const lineStyle='display:grid;grid-template-columns:3.8em minmax(0,max-content);min-width:max-content;line-height:1.2;min-height:1.2em;background:transparent;';
const lnStyle='display:block;padding:0 1em 0 0;text-align:right;color:#66707d;user-select:none;border-right:1px solid rgba(102,204,255,.16);background:linear-gradient(90deg,rgba(43,45,48,.38),rgba(43,45,48,.14));font-variant-numeric:tabular-nums;';
const srcStyle='display:block;padding:0 22px;white-space:pre;background:transparent;';

function langOf(code){
  const m=/language-([^\s]+)/.exec(code.className||'');
  if(m){const x=m[1].toLowerCase();return x==='c++'||x==='c'?'cpp':x;}
  return 'cpp';
}
function fontStyle(n){
  let s='';
  if(n&1)s+='font-style:italic;';
  if(n&2)s+='font-weight:700;';
  if(n&4)s+='text-decoration:underline;';
  return s;
}
function tokenHtml(tokens){
  return tokens.map(line=>line.map(t=>{
    const color=t.color||'#bcbec4';
    return `<span style="color:${color};${fontStyle(t.fontStyle||0)}">${esc(t.content)}</span>`;
  }).join('')||'&#8203;');
}
function lineHtml(lines){
  return lines.map((line,i)=>`<span class="code-line" style="${lineStyle}"><span class="code-ln" style="${lnStyle}">${i+1}</span><span class="code-src" style="${srcStyle}">${line}</span></span>`).join('');
}
function addCopy(pre,raw){
  if(pre.querySelector('.copy-code-btn'))return;
  pre.classList.add('has-copy');pre.style.position='relative';
  const b=document.createElement('button');b.type='button';b.className='copy-code-btn';b.textContent='COPY';b.setAttribute('style',btnStyle);
  b.onclick=async()=>{try{await navigator.clipboard.writeText(raw);b.textContent='COPIED';b.classList.add('is-copied');setTimeout(()=>{b.textContent='COPY';b.classList.remove('is-copied')},1200)}catch{b.textContent='FAIL';setTimeout(()=>b.textContent='COPY',1200)}};
  pre.append(b);
}
function fallback(code,raw){code.innerHTML=lineHtml(esc(raw).replace(/\n$/,'').split('\n'));}
async function enhanceCodeBlock(code){
  if(code.dataset.shikiEnhanced==='1')return;
  const pre=code.closest('pre');if(!pre)return;
  const raw=code.dataset.rawCode||code.textContent||'';code.dataset.rawCode=raw;addCopy(pre,raw);
  const lang=langOf(code);
  try{
    const r=await codeToTokens(raw,{lang,theme});
    code.innerHTML=lineHtml(tokenHtml(r.tokens||[]));
  }catch{fallback(code,raw)}
  code.dataset.shikiEnhanced='1';
  code.classList.add('shiki-code','line-numbered-code',`language-${lang}`);
  code.setAttribute('style',codeStyle);
}
function enhance(root=document){root.querySelectorAll('pre code').forEach(enhanceCodeBlock)}
new MutationObserver(()=>enhance()).observe(document.documentElement,{childList:true,subtree:true});
enhance();
