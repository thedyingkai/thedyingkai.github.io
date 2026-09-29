const requests = new Map();
const HIGHLIGHT = '/assets/vendor/highlight.js/11.11.1/';

// Dependencies belong to the document, not an individual article. A navigation
// may stop waiting for them without cancelling the next article's shared load.
function loadScript(source, ready) {
  if (ready()) return Promise.resolve();
  if (!requests.has(source)) {
    const request = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); }
        else resolve();
      };
      const timer = setTimeout(() => finish(new Error(`依赖加载超时：${source}`)), 15000);
      script.src = source;
      script.onload = () => finish(ready() ? null : new Error(`依赖不可用：${source}`));
      script.onerror = () => finish(new Error(`依赖加载失败：${source}`));
      document.head.append(script);
    }).catch(error => {
      if (requests.get(source) === request) requests.delete(source);
      throw error;
    });
    requests.set(source, request);
  }
  return requests.get(source);
}

export async function loadArticleDependencies() {
  await Promise.all([
    loadScript('/assets/vendor/marked/4.0.12/marked.min.js', () => !!window.marked?.parse),
    loadScript(`${HIGHLIGHT}highlight.min.js`, () => !!window.hljs?.highlight)
  ]);
  await Promise.all(['c', 'cpp', 'python', 'java', 'bash'].map(language =>
    loadScript(`${HIGHLIGHT}languages/${language}.min.js`, () => !!window.hljs?.getLanguage(language))
  ));
}
