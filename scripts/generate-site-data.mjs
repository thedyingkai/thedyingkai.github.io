import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePost, comparePosts, postDate } from '../assets/lib/posts.js';
import { isPostFile, postUrl } from '../assets/lib/urls.js';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[char]));

export async function buildSiteData(root = projectRoot) {
  const domain = (await readFile(path.join(root, 'CNAME'), 'utf8')).trim();
  if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error('CNAME must contain a domain name');
  const site = `https://${domain}`;
  const files = (await readdir(path.join(root, 'posts'))).filter(isPostFile).sort();
  const posts = await Promise.all(files.map(async file => {
    const { body, ...metadata } = parsePost(file, await readFile(path.join(root, 'posts', file), 'utf8'));
    if (metadata.date && !postDate(metadata.date)) throw new Error(`${file}: invalid publication date`);
    return metadata;
  }));
  posts.sort(comparePosts);
  const outputs = new Map();
  outputs.set('config/posts.json', JSON.stringify({
    version: 2, files: posts.map(post => post.fileName), posts
  }, null, 2) + '\n');

  // No wall-clock timestamps: repeated builds of unchanged content are identical.
  // Undated notes stay undated instead of appearing newly published every deploy.
  const lastDate = Math.max(0, ...posts.map(post => postDate(post.date)));
  const rssItems = posts.map(post => {
    const url = escapeXml(postUrl(post.fileName, site));
    const date = postDate(post.date);
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
${date ? `      <pubDate>${new Date(date).toUTCString()}</pubDate>\n` : ''}      <description>${escapeXml(post.description)}</description>
${post.tags.map(tag => `      <category>${escapeXml(tag)}</category>`).join('\n')}
    </item>`;
  }).join('\n');
  outputs.set('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TDK 的小窝</title>
    <link>${site}/</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>thedyingkai_ 的个人博客、算法笔记、项目归档和成长记录。</description>
    <language>zh-CN</language>
${lastDate ? `    <lastBuildDate>${new Date(lastDate).toUTCString()}</lastBuildDate>\n` : ''}${rssItems}
  </channel>
</rss>
`);
  const routes = ['/', '/blog/', '/about/', '/projects/', '/cloud/', '/friends/', '/rss.xml'];
  const urls = [...routes.map(route => site + route), ...posts.map(post => postUrl(post.fileName, site))];
  outputs.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
</urlset>
`);
  return { posts, outputs };
}

export async function generateSiteData(root = projectRoot) {
  const { posts, outputs } = await buildSiteData(root);
  await Promise.all([...outputs].map(([file, content]) => writeFile(path.join(root, file), content)));
  return posts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const posts = await generateSiteData();
  console.log(`Generated site data for ${posts.length} posts.`);
}
