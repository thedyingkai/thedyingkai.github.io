const R='thedyingkai/thedyingkai.github.io';
const B='main';
function f(file,text){
  let b=text;
  if(text.slice(0,4)==='---\n'){
    let end=text.indexOf('\n---\n',4);
    if(end>=0)b=text.slice(end+5);
  }
  return b;
}
console.log(R,B,f('x','y'));
