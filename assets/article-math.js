const SOURCE = '/assets/vendor/mathjax/3.2.2/es5/tex-chtml.js';
let pending;
let typesetting = Promise.resolve();

export function loadMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax.startup?.promise);
  if (!pending) {
    // Soft navigation does not execute inline page scripts. Keep the original
    // settings here, without replacing an already initialized MathJax instance.
    window.MathJax ||= {
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], processEscapes: true },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
      startup: { typeset: false }
    };
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
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

function enqueue(operation) {
  const result = typesetting.then(operation);
  // A failed article must not poison subsequent articles or their cleanup.
  typesetting = result.catch(() => {});
  return result;
}

export async function typesetMath(elements, { signal } = {}) {
  if (signal?.aborted) return;
  await loadMathJax();
  if (signal?.aborted) return;
  await enqueue(async () => {
    if (signal?.aborted) return;
    await window.MathJax.typesetPromise(elements);
  });
}

export function clearMath(elements) {
  // Clear after any in-flight typesetting, including typesetting on a detached
  // article. MathJax keeps an internal registry beyond the article's DOM life.
  return enqueue(async () => {
    const math = window.MathJax;
    if (!math?.typesetClear) return;
    await math.startup?.promise;
    math.typesetClear(elements);
  });
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
