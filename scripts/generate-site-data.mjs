import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const site = 'https://thedyingkai.github.io';
const postsDir = path.join(root, 'posts');

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseMetaValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(item => item.trim()).filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

function parseFrontMatter(fileName, raw) {
  const normalized = raw.replace(/\r\n?/g, '\n');
  const meta = {
    fileName,
    title: fileName.replace(/\.md$/i, ''),
    description: '',
    date: '',
    tags: []
  };

  if (normalized.startsWith('---\n')) {
    const end = normalized.indexOf('\n---\n', 4);
    if (end >= 0) {
      for (const line of normalized.slice(4, end).split('\n')) {
        const pos = line.indexOf(':');
        if (pos < 0) continue;
        const key = line.slice(0, pos).trim();
        const value = parseMetaValue(line.slice(pos + 1));
        if (key === 'title') meta.title = value;
        if (key === 'description') meta.description = value;
        if (key === 'date') meta.date = value;
        if (key === 'tags' && Array.isArray(value)) meta.tags = value;
      }
    }
  }

  if (!meta.description) meta.description = meta.title;
  return meta;
}

function dateValue(post) {
  const iso = String(post.date || '').replace(/\./g, '-');
  const time = Date.parse(`${iso}T00:00:00+08:00`);
  return Number.isFinite(time) ? time : 0;
}

function rssDate(post) {
  const time = dateValue(post);
  return new Date(time || Date.now()).toUTCString();
}

function postUrl(fileName) {
  return `${site}/blog/post/?file=${encodeURIComponent(fileName)}`;
}

const files = (await readdir(postsDir))
  .filter(file => file.endsWith('.md') && !file.startsWith('_'))
  .sort();

const posts = await Promise.all(files.map(async fileName => {
  const raw = await readFile(path.join(postsDir, fileName), 'utf8');
  return parseFrontMatter(fileName, raw);
}));

posts.sort((a, b) => dateValue(b) - dateValue(a) || a.fileName.localeCompare(b.fileName));

await writeFile(
  path.join(root, 'config', 'posts.json'),
  `${JSON.stringify({ files: posts.map(post => post.fileName) }, null, 2)}\n`,
  'utf8'
);

const rssItems = posts.map(post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl(post.fileName))}</link>
      <guid isPermaLink="true">${escapeXml(postUrl(post.fileName))}</guid>
      <pubDate>${rssDate(post)}</pubDate>
      <description>${escapeXml(post.description)}</description>
${post.tags.map(tag => `      <category>${escapeXml(tag)}</category>`).join('\n')}
    </item>`).join('\n');

await writeFile(
  path.join(root, 'rss.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TDK 的小窝</title>
    <link>${site}/</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>thedyingkai_ 的个人博客、算法笔记、项目归档和成长记录。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`,
  'utf8'
);

const staticUrls = ['/', '/blog/', '/about/', '/projects/', '/cloud/', '/friends/', '/rss.xml'];
const sitemapUrls = [
  ...staticUrls.map(url => `${site}${url}`),
  ...posts.map(post => postUrl(post.fileName))
];

await writeFile(
  path.join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
</urlset>
`,
  'utf8'
);

console.log(`Generated site data for ${posts.length} posts.`);
