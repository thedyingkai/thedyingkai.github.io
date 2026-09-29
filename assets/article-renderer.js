import { renderMarkdown } from './markdown-renderer.js?v=1.0';
import { enhanceCodeBlocks } from './code-blocks.js?v=1.1';
import { parsePost } from './lib/posts.js?v=1.0';
import { imageUrl, isPostFile } from './lib/urls.js?v=1.0';
import { loadConfig, fetchResource } from './lib/http.js?v=1.0';
import { element as el, contentRendered, showError } from './lib/dom.js?v=1.0';
import { collectHeadings, buildToc, bindToc } from './article-toc.js?v=1.0';
import { loadMathJax, updateMathOverflow } from './article-math.js?v=1.0';

let cleanup = () => {};

async function renderArticle() {
  const root = document.querySelector('[data-post-view]');
  if (!root) return;
  cleanup();
  delete root.dataset.postReady;
  const file = new URLSearchParams(location.search).get('file');
  if (!isPostFile(file)) {
    root.replaceChildren(el('article', 'render-body', '文章不存在'));
    return;
  }

  root.setAttribute('aria-busy', 'true');
  try {
    if (!window.marked?.parse) throw new Error('Markdown 解析器未加载，请重试');
    const post = parsePost(file, await fetchResource('/posts/' + encodeURIComponent(file), { format: 'text' }));
    const imageConfig = post.cover ? await loadConfig('images').catch(() => ({})) : {};
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
    enhanceCodeBlocks(body);
    const unbindToc = bindToc(toc, headings, body);
    let mathFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(mathFrame);
      mathFrame = requestAnimationFrame(() => updateMathOverflow(body));
    });
    observer.observe(body);
    cleanup = () => {
      unbindToc();
      observer.disconnect();
      cancelAnimationFrame(mathFrame);
      window.MathJax?.typesetClear?.([body, toc]);
    };
    contentRendered();

    if (body.querySelector('.math-source')) {
      const typeset = async () => {
        await loadMathJax();
        await window.MathJax.typesetPromise([body, toc]);
        updateMathOverflow(body);
      };
      try { await typeset(); }
      catch (error) {
        console.warn('公式渲染暂不可用，保留文章和公式源码。', error);
        const notice = el('p', 'render-notice');
        notice.setAttribute('role', 'status');
        notice.append('公式暂未加载成功，正文和代码仍可阅读。');
        const retry = el('button', 'btn', '重试公式');
        retry.type = 'button';
        retry.addEventListener('click', async () => {
          retry.disabled = true;
          try { await typeset(); notice.remove(); }
          catch { retry.textContent = '加载失败，点击重试'; }
          finally { retry.disabled = false; }
        });
        notice.append(retry);
        body.prepend(notice);
      }
    }
    // Anchors are inserted asynchronously; native initial navigation ran too early.
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* Ignore malformed hashes. */ }
    headings.find(item => item.id === id)?.node.scrollIntoView();
    root.dataset.postReady = 'true';
    contentRendered();
  } catch (error) {
    showError(root, `文章加载失败：${error.message}`, renderArticle);
  } finally {
    root.removeAttribute('aria-busy');
  }
}

renderArticle();
