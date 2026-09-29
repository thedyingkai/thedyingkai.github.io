import { renderMarkdown } from './markdown-renderer.js?v=1.0';
import { enhanceCodeBlocks } from './code-blocks.js?v=1.2';
import { parsePost } from './lib/posts.js?v=1.0';
import { imageUrl, isPostFile } from './lib/urls.js?v=1.0';
import { loadConfig, fetchResource } from './lib/http.js?v=1.0';
import { element as el, contentRendered, showError } from './lib/dom.js?v=1.0';
import { collectHeadings, buildToc, bindToc } from './article-toc.js?v=1.0';
import { typesetMath, clearMath, updateMathOverflow } from './article-math.js?v=1.1';
import { loadArticleDependencies } from './article-dependencies.js?v=1.0';

export async function mountPage({ root, signal, onCleanup }) {
  if (!root.matches('[data-post-view]') || signal.aborted) return;
  const file = new URLSearchParams(location.search).get('file');
  let disposed = false;
  let renderLifetime;
  let cleanupRender = () => {};
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    renderLifetime?.abort();
    cleanupRender();
    signal.removeEventListener('abort', dispose);
  };
  signal.addEventListener('abort', dispose, { once: true });
  onCleanup(dispose);

  async function renderArticle() {
    if (disposed || signal.aborted) return;
    renderLifetime?.abort();
    cleanupRender();
    cleanupRender = () => {};
    const lifetime = new AbortController();
    renderLifetime = lifetime;
    const active = () => !disposed && !signal.aborted && !lifetime.signal.aborted;
    delete root.dataset.postReady;
    if (!isPostFile(file)) {
      root.replaceChildren(el('article', 'render-body', '文章不存在'));
      return;
    }

    root.setAttribute('aria-busy', 'true');
    try {
      const [source] = await Promise.all([
        fetchResource('/posts/' + encodeURIComponent(file), { format: 'text', signal: lifetime.signal }),
        loadArticleDependencies()
      ]);
      if (!active()) return;
      const post = parsePost(file, source);
      const imageConfig = post.cover ? await loadConfig('images').catch(() => ({})) : {};
      if (!active()) return;
      const coverSrc = imageUrl(post.cover, imageConfig.basePath);
      document.title = `${post.title} · TDK 的小窝`;

      const back = el('a', 'back', '← 返回文章');
      back.href = '/blog/';
      const header = el('header', 'render-head');
      header.append(el('span', 'eyebrow', post.date), el('h1', '', post.title), el('p', 'render-desc', post.description));
      const meta = el('div', 'render-meta');
      for (const tag of post.tags) meta.append(el('span', '', `#${tag}`));
      header.append(meta);
      if (coverSrc) {
        const cover = el('figure', 'render-cover');
        const img = el('img');
        img.src = coverSrc;
        img.alt = post.coverAlt || post.title;
        img.decoding = 'async';
        cover.append(img);
        header.append(cover);
      }

      const body = el('article', 'render-body');
      body.innerHTML = renderMarkdown(post.body, window.marked);
      const headings = collectHeadings(body);
      const toc = buildToc(headings);
      const layout = el('div', 'render-layout');
      layout.append(body, toc);
      root.replaceChildren(back, header, layout);
      const unbindCode = enhanceCodeBlocks(body);
      const unbindToc = bindToc(toc, headings, body);
      let mathFrame = 0;
      const observer = new ResizeObserver(() => {
        if (!active()) return;
        cancelAnimationFrame(mathFrame);
        mathFrame = requestAnimationFrame(() => {
          if (active()) updateMathOverflow(body);
        });
      });
      observer.observe(body);
      cleanupRender = () => {
        unbindCode();
        unbindToc();
        observer.disconnect();
        cancelAnimationFrame(mathFrame);
        void clearMath([body, toc]).catch(error => console.warn('公式清理失败。', error));
      };
      contentRendered();

      if (body.querySelector('.math-source')) {
        const typeset = async () => {
          await typesetMath([body, toc], { signal: lifetime.signal });
          if (active()) updateMathOverflow(body);
        };
        try { await typeset(); }
        catch (error) {
          if (!active()) return;
          console.warn('公式渲染暂不可用，保留文章和公式源码。', error);
          const notice = el('p', 'render-notice');
          notice.setAttribute('role', 'status');
          notice.append('公式暂未加载成功，正文和代码仍可阅读。');
          const retry = el('button', 'btn', '重试公式');
          retry.type = 'button';
          retry.addEventListener('click', async () => {
            if (!active()) return;
            retry.disabled = true;
            try {
              await typeset();
              if (active()) { notice.remove(); contentRendered(); }
            } catch {
              if (active()) retry.textContent = '加载失败，点击重试';
            } finally {
              if (active()) retry.disabled = false;
            }
          }, { signal: lifetime.signal });
          notice.append(retry);
          body.prepend(notice);
        }
        if (!active()) return;
      }
      root.dataset.postReady = 'true';
      contentRendered();
    } catch (error) {
      if (!active()) return;
      cleanupRender();
      cleanupRender = () => {};
      showError(root, `文章加载失败：${error.message}`, renderArticle);
    } finally {
      if (active()) root.removeAttribute('aria-busy');
    }
  }

  await renderArticle();
}
