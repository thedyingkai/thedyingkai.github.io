export const clamp = (value, min, max, fallback = min) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
export const formatTime = seconds => {
  const value = Math.floor(clamp(seconds, 0, Number.MAX_SAFE_INTEGER));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
};

export function playlistId(config) {
  const value = String(config.playlistId || config.id || config.playlistUrl || '').trim();
  return /^\w+$/.test(value) ? value : value.match(/[?&]id=(\w+)/)?.[1] || '';
}

export function mediaUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function playlistEndpoint(config) {
  // Same provider as the previously bundled MetingJS; no extra service added.
  const api = config.api || 'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id';
  return api.replace(/:server|:type|:id/g, key => encodeURIComponent({
    ':server': config.server || 'netease', ':type': config.type || 'playlist', ':id': playlistId(config)
  }[key]));
}

export function normalizeTracks(data, base) {
  if (!Array.isArray(data)) throw new Error('歌单返回格式不正确');
  const tracks = data.map(item => ({
    name: String(item?.name || item?.title || '未命名歌曲'),
    artist: String(item?.artist || item?.author || '未知歌手'),
    url: mediaUrl(item?.url, base),
    cover: mediaUrl(item?.cover || item?.pic, base),
    lrc: String(item?.lrc || item?.lyric || '')
  })).filter(track => track.url);
  if (!tracks.length) throw new Error('歌单中没有可播放的歌曲');
  return tracks;
}

export function musicSettings(config, state = {}) {
  const saved = state?.settings || {};
  const option = (key, allowed, fallback) => allowed.includes(saved[key]) ? saved[key] : allowed.includes(config[key]) ? config[key] : fallback;
  return {
    order: option('order', ['list', 'random'], 'list'),
    loop: option('loop', ['all', 'one', 'none'], 'all'),
    volume: clamp(saved.volume ?? state?.volume ?? config.volume ?? .45, 0, 1, .45),
    muted: (saved.muted ?? state?.muted) === true,
    playbackRate: clamp(saved.playbackRate ?? state?.playbackRate ?? 1, .5, 2, 1),
    lrcVisible: (saved.lrcVisible ?? config.lrcVisible) !== false,
    minimized: (saved.minimized ?? saved.collapsed ?? config.mini) === true
  };
}

export function restoredIndex(tracks, state) {
  // Never apply an old track's timestamp to a different song after reordering.
  if (!state?.currentUrl) return -1;
  const identity = value => {
    try {
      const url = new URL(value);
      if (url.searchParams.get('type') === 'url' && url.searchParams.has('id')) {
        // Meting may rotate auth parameters while the underlying song is unchanged.
        return `${url.origin}${url.pathname}?server=${url.searchParams.get('server')}&id=${url.searchParams.get('id')}`;
      }
    } catch { /* Non-URL keys are useful for local fixtures. */ }
    return value;
  };
  const key = identity(state.currentUrl);
  return tracks.findIndex(track => identity(track.url) === key);
}

export function shuffledIndices(length, current, random = Math.random) {
  const values = Array.from({ length }, (_, index) => index).filter(index => index !== current);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function parseLyrics(text) {
  const offset = Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
  const lines = [];
  for (const line of text.split(/\r?\n/)) {
    const times = [...line.matchAll(/\[(\d+):(\d{1,2}(?:\.\d+)?)\]/g)];
    const words = line.replace(/\[[^\]]*\]/g, '').trim();
    for (const time of times) lines.push({ time: Math.max(0, Number(time[1]) * 60 + Number(time[2]) + offset), text: words });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function lyricAt(lines, seconds) {
  let lo = 0;
  let hi = lines.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].time <= seconds) lo = mid + 1;
    else hi = mid;
  }
  return lo ? lines[lo - 1].text : '';
}

export async function fetchWithTimeout(url, { signal, timeout = 12000, format = 'json', fetcher = fetch } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response[format]();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
