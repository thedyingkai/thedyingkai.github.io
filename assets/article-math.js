const SOURCE = '/assets/vendor/mathjax/3.2.2/es5/tex-chtml.js';
let pending;

export function loadMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax.startup?.promise);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const finish = error => {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); } else resolve();
      };
      const timer = setTimeout(() => finish(new Error('MathJax load timed out')), 15000);
      script.src = SOURCE;
      script.onload = () => {
        if (!window.MathJax?.typesetPromise) return finish(new Error('MathJax unavailable'));
        Promise.resolve(window.MathJax.startup?.promise).then(() => finish(), finish);
      };
      script.onerror = () => finish(new Error('MathJax failed to load'));
      document.head.append(script);
    }).catch(error => { pending = null; throw error; });
  }
  return pending;
}

// Overflow is a layout property, not a function of TeX source length.
export function updateMathOverflow(root) {
  const nodes = [...root.querySelectorAll('mjx-container[display="true"]')];
  nodes.forEach(node => node.classList.remove('is-overflowing'));
  const overflowing = nodes.map(node => {
    const width = node.parentElement.clientWidth;
    return width > 0 && Math.max(node.scrollWidth, ...[...node.children].map(child => child.getBoundingClientRect().width)) > width + 2;
  });
  nodes.forEach((node, index) => node.classList.toggle('is-overflowing', overflowing[index]));
}
