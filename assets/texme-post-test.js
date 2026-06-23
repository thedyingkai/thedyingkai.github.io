const R='thedyingkai/thedyingkai.github.io';
const B='main';
function f(text){
  if(text.slice(0,4)==='---\n')return text.indexOf('\n---\n',4);
  return -1;
}
console.log(R,B,f('x'));
