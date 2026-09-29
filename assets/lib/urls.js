const DEFAULT_ORIGIN = 'https://blog.thedyingkai.cn';
const origin = () => typeof location === 'undefined' ? DEFAULT_ORIGIN : location.href;

export function safeUrl(value, fallback = '', base = origin(), protocols = ['http:', 'https:', 'mailto:']) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return fallback;
  try {
    const url = new URL(raw, base);
    return protocols.includes(url.protocol) ? raw : fallback;
  } catch { return fallback; }
}

export function httpUrl(value, base = origin()) {
  const safe = safeUrl(value, '', base, ['http:', 'https:']);
  return safe ? new URL(safe, base).href : '';
}

export function isExternalUrl(value, base = origin()) {
  const safe = httpUrl(value, base);
  return !!safe && new URL(safe).origin !== new URL(base).origin;
}

export function imageUrl(value, basePath = '/assets/images/anime/', base = origin()) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  // Reject schemes before resolving relative image paths.
  if (/^[\w+.-]+:/.test(raw) || raw.startsWith('//') || raw.startsWith('/')) return httpUrl(raw, base);
  return httpUrl(raw, new URL(basePath || '/', base).href);
}

export function isPostFile(value) {
  return typeof value === 'string' && !value.startsWith('_') && /^[^/\\\x00-\x1f?#]+\.md$/.test(value);
}

export function postUrl(file, base = '') {
  if (!isPostFile(file)) throw new Error(`Invalid post filename: ${file}`);
  return `${base}/blog/post/?file=${encodeURIComponent(file)}`;
}
