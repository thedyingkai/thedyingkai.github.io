import { readdir } from 'node:fs/promises';
import path from 'node:path';

export const publicDirectories = ['about', 'assets', 'blog', 'cloud', 'config', 'friends', 'posts', 'projects'];
export const publicFiles = ['index.html', '404.html', 'CNAME', 'robots.txt', 'rss.xml', 'sitemap.xml', 'b6396624fbbb51ff62294d8f41512c82.txt'];

export async function walkFiles(directory, { skip = [] } = {}) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Public source must not be a symlink: ${absolute}`);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute, { skip }));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}
