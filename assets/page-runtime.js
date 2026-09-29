import { contentRendered, showError } from './lib/dom.js?v=1.0';

// A page owns its async work, observers and listeners. The player and shared
// shell deliberately live outside this scope and survive every page swap.
export function mountPageContent(root) {
  const controller = new AbortController();
  const cleanups = new Set();
  const scope = {
    root,
    signal: controller.signal,
    onCleanup(cleanup) {
      if (typeof cleanup !== 'function') return;
      if (controller.signal.aborted) cleanup();
      else cleanups.add(cleanup);
    }
  };
  const imports = [];
  if (root.matches('[data-post-view]')) imports.push(() => import('./article-renderer.js?v=6.2'));
  if (root.querySelector('[data-post-list]')) imports.push(() => import('./post-list.js?v=2.1'));
  if (root.querySelector('[data-config^="home."], [data-config^="projects."], [data-config^="about."], [data-config^="friends."], [id^="busuanzi_value_"]')) imports.push(() => import('./runtime-config.js?v=2.1'));
  if (root.querySelector('[data-image-slot], [data-image-stack]')) imports.push(() => import('./images.js?v=3.1'));
  if (root.querySelector('[data-cloud-entries]')) imports.push(() => import('./cloud.js?v=2.1'));

  const ready = Promise.allSettled(imports.map(async load => {
    try {
      const module = await load();
      if (!scope.signal.aborted) await module.mountPage(scope);
    } catch (error) {
      if (scope.signal.aborted) return;
      console.warn('页面初始化失败。', error);
      const target = document.createElement('div');
      root.prepend(target);
      showError(target, `页面初始化失败：${error.message}。请重新点击站内链接重试。`);
    }
  })).finally(() => {
    if (!scope.signal.aborted) contentRendered();
  });

  return {
    ready,
    dispose() {
      controller.abort();
      for (const cleanup of cleanups) {
        try { cleanup(); } catch (error) { console.warn('页面清理失败。', error); }
      }
      cleanups.clear();
    }
  };
}
