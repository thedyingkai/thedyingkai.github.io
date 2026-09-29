import { loadConfig, fetchResource, mapConcurrent } from './lib/http.js?v=1.0';
import { parsePost, postFiles, comparePosts } from './lib/posts.js?v=1.0';

let indexRequest;
export function loadPostIndex({ reload = false } = {}) {
  if (reload) indexRequest = null;
  if (!indexRequest) indexRequest = readIndex(reload).catch(error => { indexRequest = null; throw error; });
  return indexRequest;
}

async function readIndex(reload) {
  const manifest = await loadConfig('posts', { reload });
  const files = postFiles(manifest);
  if (manifest.version === 2 && Array.isArray(manifest.posts)) {
    const posts = manifest.posts;
    if (posts.length === files.length && posts.every(post => post && files.includes(post.fileName) && typeof post.title === 'string' && Array.isArray(post.tags) && post.tags.every(tag => typeof tag === 'string')) && new Set(posts.map(post => post.fileName)).size === files.length) {
      return { files, posts: [...posts].sort(comparePosts), failures: [] };
    }
  }
  // Compatibility for old manifests and local previews before generation.
  const results = await mapConcurrent(files, async file => parsePost(file, await fetchResource(`/posts/${encodeURIComponent(file)}`, { format: 'text' })));
  const posts = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failures = files.filter((_, index) => results[index].status === 'rejected');
  if (files.length && !posts.length) throw new Error('文章暂时无法加载，请稍后重试');
  // A partial load must not poison retries with a permanently incomplete index.
  if (failures.length) indexRequest = null;
  return { files, posts: posts.sort(comparePosts), failures };
}
