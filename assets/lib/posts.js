import { isPostFile } from './urls.js?v=1.0';

function scalar(value) {
  const text = value.trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    try { return JSON.parse(text); } catch { return text.slice(1, -1); }
  }
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  return text;
}

export function parseMetaValue(value) {
  const text = value.trim();
  if (!text.startsWith('[') || !text.endsWith(']')) return scalar(text);
  const values = [];
  let quote = '';
  let start = 1;
  for (let i = 1; i < text.length - 1; i++) {
    const char = text[i];
    if (quote && char === '\\' && quote === '"') { i++; continue; }
    if (char === quote) quote = '';
    else if (!quote && (char === "'" || char === '"')) quote = char;
    else if (!quote && char === ',') { values.push(scalar(text.slice(start, i))); start = i + 1; }
  }
  values.push(scalar(text.slice(start, -1)));
  return values.filter(value => typeof value === 'string' && value.length > 0);
}

export function parsePost(fileName, rawText) {
  if (!isPostFile(fileName)) throw new Error(`Invalid post filename: ${fileName}`);
  const normalized = rawText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(normalized);
  const meta = {};
  if (match) {
    for (const line of match[1].split('\n')) {
      const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
      if (field) meta[field[1]] = parseMetaValue(field[2]);
    }
  }
  const body = match ? normalized.slice(match[0].length) : normalized;
  const title = typeof meta.title === 'string' && meta.title ? meta.title :
    body.match(/^#{1,6}\s+(.+)$/m)?.[1]?.replace(/[*_`$\\{}]/g, '').trim() || fileName.replace(/\.md$/, '');
  return {
    fileName, title,
    description: typeof meta.description === 'string' && meta.description ? meta.description : title,
    date: typeof meta.date === 'string' ? meta.date : '',
    tags: Array.isArray(meta.tags) ? meta.tags : ['笔记'],
    cover: String(meta.cover || meta.image || ''),
    coverAlt: String(meta.coverAlt || meta.cover_alt || meta.imageAlt || ''),
    body
  };
}

export function postDate(value) {
  const match = /^(\d{4})[-.](\d{1,2})[-.](\d{1,2})$/.exec(String(value || ''));
  if (!match) return 0;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return 0;
  return date.getTime() - 8 * 3600000;
}

export function comparePosts(a, b) {
  return postDate(b.date) - postDate(a.date) || (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0);
}

export function postFiles(manifest) {
  const files = Array.isArray(manifest) ? manifest : manifest?.files;
  if (!Array.isArray(files) || files.some(file => !isPostFile(file))) throw new Error('文章索引中的文件名无效');
  return [...new Set(files)];
}
