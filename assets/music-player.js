import { formatTime, playlistId, playlistEndpoint, normalizeTracks, musicSettings, restoredIndex, shuffledIndices, parseLyrics, lyricAt, mediaUrl, fetchWithTimeout } from './music-model.js?v=1.0';

const icons = {
  play: '<path d="m9 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  previous: '<path d="M5 5v14m14-14L8 12l11 7Z"/>',
  next: '<path d="M19 5v14M5 5l11 7-11 7Z"/>',
  fold: '<path d="m14 6-6 6 6 6"/>',
  expand: '<path d="m10 6 6 6-6 6"/>',
  retry: '<path d="M20 7v5h-5M4 17a8 8 0 1 0 0-10"/>',
  music: '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function iconButton(name, label) {
  const button = element('button', 'music-player__button');
  button.type = 'button';
  setIcon(button, name, label);
  return button;
}
function setIcon(button, name, label) {
  if (button.dataset.icon !== name) {
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
    button.dataset.icon = name;
  }
  button.title = label;
  button.setAttribute('aria-label', label);
}
function textButton(label) {
  const button = element('button', 'music-player__setting', label);
  button.type = 'button';
  return button;
}
function range(label, max, step = 1) {
  const input = element('input', 'music-player__range');
  input.type = 'range';
  input.min = '0';
  input.max = String(max);
  input.step = String(step);
  input.value = '0';
  input.setAttribute('aria-label', label);
  return input;
}
function readState(key) {
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      const value = JSON.parse(window[name].getItem(key) || 'null');
      if (value && typeof value === 'object') return value;
    } catch { /* Storage may be disabled; the player still works. */ }
  }
  return {};
}
function writeState(key, value) {
  for (const name of ['localStorage', 'sessionStorage']) {
    try { window[name].setItem(key, JSON.stringify(value)); } catch { /* Optional persistence. */ }
  }
}

export function createMusicPlayer(config, host = document.body) {
  const id = playlistId(config) || 'local';
  const stateKey = `tdk-music:${id}`;
  const saved = readState(stateKey);
  const settings = musicSettings(config, saved);
  const events = new AbortController();
  const audio = new Audio();
  audio.preload = config.preload === 'none' ? 'none' : 'metadata';
  audio.volume = settings.volume;
  audio.muted = settings.muted;
  audio.playbackRate = settings.playbackRate;
  let tracks = [];
  let index = -1;
  let phase = 'idle';
  let playing = false;
  let autoplayBlocked = false;
  let pendingSeek = 0;
  let seeking = false;
  let playRequest = 0;
  let loading;
  let mediaTimer;
  let lyricsRequest;
  let lyrics = [];
  let lyricKey = '';
  let shuffled = [];
  const history = [];
  const lyricsCache = new Map();
  let lastSave = 0;

  const dock = element('section', 'music-player');
  dock.setAttribute('aria-label', '音乐播放器');
  const bar = element('div', 'music-player__bar');
  const cover = iconButton('music', '打开音乐面板');
  cover.classList.add('music-player__cover');
  const info = textButton('');
  info.className = 'music-player__summary';
  info.title = '打开歌单与播放设置';
  const title = element('strong', '', '随身听');
  const subtitle = element('span', '', '点击播放，载入歌单');
  info.append(title, subtitle);
  const previous = iconButton('previous', '上一首');
  const play = iconButton('play', '加载并播放');
  play.classList.add('music-player__play');
  const next = iconButton('next', '下一首');
  const fold = iconButton('fold', '最小化播放器');
  bar.append(cover, info, previous, play, next, fold);
  previous.disabled = next.disabled = true;

  const panel = element('div', 'music-player__panel');
  panel.id = 'music-player-panel';
  panel.hidden = true;
  const heading = element('div', 'music-player__heading');
  const panelTitle = element('strong', '', '播放列表');
  const close = textButton('收起面板');
  heading.append(panelTitle, close);
  const status = element('p', 'music-player__status', '按需加载，不会自动播放。');
  status.setAttribute('role', 'status');
  const progress = element('div', 'music-player__progress');
  const current = element('span', '', '0:00');
  const seek = range('播放进度', 1000);
  seek.disabled = true;
  const duration = element('span', '', '0:00');
  progress.append(current, seek, duration);
  const lyric = element('p', 'music-player__lyric', '播放后显示歌词');
  const controls = element('div', 'music-player__settings');
  const order = textButton('');
  const loop = textButton('');
  const lrc = textButton('歌词');
  const mute = textButton('静音');
  const volumeLabel = element('label', 'music-player__volume', '音量');
  const volume = range('音量', 1, .01);
  volume.value = String(settings.volume);
  volumeLabel.append(volume);
  controls.append(order, loop, lrc, mute, volumeLabel);
  const search = element('input', 'music-player__search');
  search.type = 'search';
  search.placeholder = '搜索歌名 / 歌手';
  search.setAttribute('aria-label', '搜索歌单');
  const list = element('div', 'music-player__list');
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', '歌曲');
  const external = element('a', 'music-player__external', '在音乐平台打开歌单 ↗');
  external.href = mediaUrl(config.playlistUrl, location.href) || `https://music.163.com/#/playlist?id=${encodeURIComponent(id)}`;
  external.target = '_blank';
  external.rel = 'noreferrer';
  panel.append(heading, status, progress, lyric, controls, search, list, external);
  dock.append(panel, bar);
  host.append(dock);
  document.body.classList.add('has-music-player');

  const on = (target, type, callback) => target.addEventListener(type, callback, { signal: events.signal });
  const persist = () => {
    lastSave = Date.now();
    // Do not overwrite a saved track while its lazy playlist is still unloaded.
    writeState(stateKey, { ...saved, id, version: 3, settings: { ...settings }, ...(index < 0 ? {} : {
      currentUrl: tracks[index].url, index, currentTime: pendingSeek || audio.currentTime || 0,
      track: tracks[index], playing, paused: !playing, savedAt: lastSave
    }) });
  };
  const setStatus = text => { status.textContent = text; };
  function syncControls() {
    const canPause = playing || phase === 'buffering';
    setIcon(play, phase === 'error' ? 'retry' : canPause ? 'pause' : 'play', phase === 'error' ? '重试播放' : phase === 'loading' ? '正在加载歌单' : canPause ? '暂停' : index < 0 ? '加载并播放' : '播放');
    play.disabled = phase === 'loading';
    play.setAttribute('aria-busy', String(phase === 'loading' || phase === 'buffering'));
    dock.classList.toggle('is-playing', playing);
    dock.classList.toggle('is-background', document.hidden);
    previous.disabled = next.disabled = tracks.length < 2;
    order.textContent = settings.order === 'random' ? '随机播放' : '顺序播放';
    order.setAttribute('aria-pressed', String(settings.order === 'random'));
    loop.textContent = { all: '列表循环', one: '单曲循环', none: '不循环' }[settings.loop];
    lrc.setAttribute('aria-pressed', String(settings.lrcVisible));
    mute.setAttribute('aria-pressed', String(settings.muted));
    mute.textContent = settings.muted ? '取消静音' : '静音';
    volume.value = String(settings.volume);
    lyric.hidden = !settings.lrcVisible;
    dock.classList.toggle('is-mini', settings.minimized);
    setIcon(fold, settings.minimized ? 'expand' : 'fold', settings.minimized ? '展开播放器' : '最小化播放器');
    if (index >= 0) subtitle.textContent = phase === 'error' ? '无法播放 · 点击重试或换一首' : phase === 'buffering' ? '缓冲中…' : autoplayBlocked ? '浏览器限制 · 请再点一次播放' : tracks[index].artist;
  }
  function syncProgress() {
    const length = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.disabled = !length;
    duration.textContent = formatTime(length);
    if (!seeking) {
      seek.value = String(length ? (pendingSeek || audio.currentTime) / length * 1000 : 0);
      current.textContent = formatTime(pendingSeek || audio.currentTime);
    }
    seek.setAttribute('aria-valuetext', `${current.textContent} / ${duration.textContent}`);
    const text = lyricAt(lyrics, audio.currentTime);
    if (lyrics.length) lyric.textContent = text || '♪';
  }
  function renderList() {
    const query = search.value.trim().toLocaleLowerCase();
    const fragment = document.createDocumentFragment();
    let count = 0;
    tracks.forEach((track, i) => {
      if (query && !`${track.name} ${track.artist}`.toLocaleLowerCase().includes(query)) return;
      count++;
      const item = textButton('');
      item.className = 'music-player__track';
      item.dataset.index = String(i);
      item.setAttribute('aria-label', `播放 ${track.name}，${track.artist}`);
      item.setAttribute('aria-current', String(i === index));
      item.append(element('span', '', track.name), element('small', '', track.artist));
      fragment.append(item);
    });
    if (!count) fragment.append(element('p', 'music-player__empty', tracks.length ? '没有匹配歌曲' : '点击播放以加载歌单'));
    list.replaceChildren(fragment);
    panelTitle.textContent = tracks.length ? `歌单 · ${count} / ${tracks.length}` : '播放列表';
  }
  async function loadLyrics() {
    const track = tracks[index];
    if (!track || panel.hidden || !settings.lrcVisible || lyricKey === track.url) return;
    lyricsRequest?.abort();
    lyricsRequest = new AbortController();
    const request = lyricsRequest;
    lyricKey = track.url;
    lyrics = [];
    lyric.textContent = '歌词加载中…';
    try {
      if (!lyricsCache.has(track.url)) {
        const inline = /\[\d+:\d/.test(track.lrc);
        const url = mediaUrl(track.lrc, location.href);
        const text = inline ? track.lrc : url ? await fetchWithTimeout(url, { signal: request.signal, format: 'text', timeout: 8000 }) : '';
        lyricsCache.set(track.url, parseLyrics(text));
        if (lyricsCache.size > 12) lyricsCache.delete(lyricsCache.keys().next().value);
      }
      if (request.signal.aborted) return;
      lyrics = lyricsCache.get(track.url);
      lyric.textContent = lyrics.length ? '♪' : '暂无歌词';
      syncProgress();
    } catch {
      if (!request.signal.aborted) { lyric.textContent = '歌词暂不可用，播放不受影响'; lyricKey = ''; }
    }
  }
  function togglePanel(open = panel.hidden) {
    panel.hidden = !open;
    if (open) settings.minimized = false;
    [cover, info].forEach(button => {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-controls', panel.id);
    });
    syncControls();
    if (open) { renderList(); void loadLyrics(); }
    persist();
  }
  function mediaFailed(message) {
    clearTimeout(mediaTimer);
    playRequest++;
    audio.pause();
    playing = false;
    phase = 'error';
    setStatus(message);
    syncControls();
  }
  async function startPlayback() {
    if (index < 0) return;
    const request = ++playRequest;
    autoplayBlocked = false;
    phase = 'buffering';
    setStatus('正在加载音频…');
    syncControls();
    clearTimeout(mediaTimer);
    mediaTimer = setTimeout(() => mediaFailed('音频加载超时。可重试、换一首，或在音乐平台收听。'), 20000);
    try {
      await audio.play();
    } catch (error) {
      if (request !== playRequest || error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') {
        clearTimeout(mediaTimer);
        phase = 'ready';
        autoplayBlocked = true;
        setStatus('歌单已就绪，请再点一次播放。浏览器阻止了自动播放。');
        syncControls();
      } else mediaFailed('这首歌暂时无法播放。可重试、换一首，或在音乐平台收听。');
    }
  }
  function selectTrack(target, shouldPlay, restoreTime = 0) {
    playRequest++;
    clearTimeout(mediaTimer);
    audio.pause();
    playing = false;
    index = target;
    seeking = false;
    autoplayBlocked = false;
    pendingSeek = Math.max(0, Number(restoreTime) || 0);
    lyricsRequest?.abort();
    lyricKey = '';
    lyrics = [];
    lyric.textContent = '♪';
    const track = tracks[index];
    audio.src = track.url;
    audio.load();
    audio.playbackRate = settings.playbackRate;
    title.textContent = track.name;
    title.title = `${track.name} — ${track.artist}`;
    cover.querySelector('img')?.remove();
    if (track.cover) {
      const image = element('img', '');
      image.alt = '';
      image.src = track.cover;
      image.onerror = () => image.remove();
      cover.append(image);
    }
    phase = 'ready';
    setStatus('已就绪');
    list.querySelectorAll('[data-index]').forEach(item => item.setAttribute('aria-current', String(Number(item.dataset.index) === index)));
    syncControls();
    syncProgress();
    void loadLyrics();
    persist();
    if (shouldPlay) void startPlayback();
  }
  async function loadPlaylist(shouldPlay) {
    if (loading) return;
    loading = new AbortController();
    phase = 'loading';
    subtitle.textContent = '正在加载歌单…';
    setStatus('正在连接歌单，最多等待 12 秒…');
    syncControls();
    try {
      const data = config.audio || await fetchWithTimeout(playlistEndpoint(config), { signal: loading.signal });
      if (events.signal.aborted) return;
      tracks = normalizeTracks(data, location.href);
      const restored = restoredIndex(tracks, saved);
      const first = restored >= 0 ? restored : settings.order === 'random' ? Math.floor(Math.random() * tracks.length) : 0;
      shuffled = shuffledIndices(tracks.length, first);
      selectTrack(first, shouldPlay, restored >= 0 ? saved.currentTime : 0);
      renderList();
    } catch {
      if (events.signal.aborted) return;
      phase = 'error';
      subtitle.textContent = '歌单加载失败 · 点击重试';
      setStatus('歌单暂不可用（网络、跨域限制或服务异常）。点击播放按钮重试，也可以在音乐平台打开。');
      syncControls();
    } finally { loading = null; }
  }
  function advance(direction, automatic = false) {
    if (!tracks.length) return;
    let target;
    if (automatic && settings.loop === 'one') target = index;
    else if (direction < 0 && settings.order === 'random') target = history.pop() ?? index;
    else if (settings.order === 'random') {
      if (!shuffled.length) {
        if (automatic && settings.loop === 'none') { setStatus('歌单播放完毕'); return; }
        shuffled = shuffledIndices(tracks.length, index);
      }
      target = shuffled.shift() ?? index;
      history.push(index);
    } else {
      if (automatic && settings.loop === 'none' && index === tracks.length - 1) { setStatus('歌单播放完毕'); return; }
      target = (index + direction + tracks.length) % tracks.length;
    }
    if (history.length > 100) history.shift();
    selectTrack(target, true);
  }

  on(play, 'click', () => {
    if (!tracks.length) { void loadPlaylist(true); return; }
    if (playing || phase === 'buffering') {
      playRequest++;
      clearTimeout(mediaTimer);
      audio.pause();
      playing = false;
      phase = 'ready';
      syncControls();
    } else {
      if (phase === 'error') selectTrack(index, false, audio.currentTime);
      void startPlayback();
    }
  });
  on(previous, 'click', () => advance(-1));
  on(next, 'click', () => advance(1));
  on(cover, 'click', () => togglePanel());
  on(info, 'click', () => togglePanel());
  on(close, 'click', () => { togglePanel(false); info.focus(); });
  on(fold, 'click', () => {
    settings.minimized = !settings.minimized;
    if (settings.minimized) togglePanel(false);
    syncControls();
    persist();
  });
  on(dock, 'keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { togglePanel(false); info.focus(); }
  });
  on(search, 'input', renderList);
  on(list, 'click', event => {
    const item = event.target.closest('[data-index]');
    if (!item) return;
    history.push(index);
    const target = Number(item.dataset.index);
    shuffled = shuffledIndices(tracks.length, target);
    selectTrack(target, true);
  });
  on(order, 'click', () => {
    settings.order = settings.order === 'random' ? 'list' : 'random';
    shuffled = shuffledIndices(tracks.length, index);
    history.length = 0;
    syncControls(); persist();
  });
  on(loop, 'click', () => {
    settings.loop = { all: 'one', one: 'none', none: 'all' }[settings.loop];
    syncControls(); persist();
  });
  on(lrc, 'click', () => {
    settings.lrcVisible = !settings.lrcVisible;
    syncControls(); persist(); void loadLyrics();
  });
  on(mute, 'click', () => { audio.muted = !audio.muted; });
  on(volume, 'input', () => { audio.volume = Number(volume.value); audio.muted = false; });
  on(seek, 'input', () => {
    seeking = true;
    current.textContent = formatTime(Number(seek.value) / 1000 * audio.duration);
    seek.setAttribute('aria-valuetext', `${current.textContent} / ${duration.textContent}`);
  });
  const commitSeek = () => {
    if (!seeking) return;
    seeking = false;
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
    pendingSeek = 0;
    syncProgress(); persist();
  };
  on(seek, 'change', commitSeek);
  on(seek, 'blur', commitSeek);
  on(seek, 'pointercancel', () => { seeking = false; syncProgress(); });
  on(audio, 'loadedmetadata', () => {
    if (pendingSeek && Number.isFinite(audio.duration)) {
      audio.currentTime = pendingSeek < audio.duration ? pendingSeek : 0;
      pendingSeek = 0;
    }
    syncProgress();
  });
  on(audio, 'durationchange', syncProgress);
  on(audio, 'timeupdate', () => {
    syncProgress();
    if (Date.now() - lastSave > 5000) persist();
  });
  on(audio, 'playing', () => {
    clearTimeout(mediaTimer);
    playing = true; phase = 'ready'; setStatus('正在播放'); syncControls(); persist();
  });
  on(audio, 'pause', () => {
    playing = false; syncControls(); persist();
    if (phase === 'ready') setStatus('已暂停');
  });
  on(audio, 'waiting', () => {
    if (!audio.paused) {
      phase = 'buffering'; setStatus('缓冲中…'); syncControls();
      clearTimeout(mediaTimer);
      mediaTimer = setTimeout(() => mediaFailed('音频缓冲超时。请重试或换一首。'), 20000);
    }
  });
  on(audio, 'error', () => { if (index >= 0) mediaFailed('音频不可用，可能有版权或网络限制。请重试或换一首。'); });
  on(audio, 'ended', () => { playing = false; syncControls(); advance(1, true); });
  on(audio, 'volumechange', () => {
    settings.volume = audio.volume; settings.muted = audio.muted; syncControls(); persist();
  });
  on(document, 'visibilitychange', () => { syncControls(); if (document.hidden) persist(); });
  on(window, 'pagehide', persist);
  togglePanel(false);
  renderList();
  if (config.lazyLoad === false) void loadPlaylist(config.autoplay === true);

  return {
    destroy() {
      persist();
      events.abort(); loading?.abort(); lyricsRequest?.abort(); clearTimeout(mediaTimer);
      playRequest++; audio.pause(); audio.removeAttribute('src'); audio.load();
      dock.remove(); document.body.classList.remove('has-music-player');
    }
  };
}

export async function initMusicPlayer() {
  if (document.querySelector('.music-player')) return;
  try {
    const config = await fetchWithTimeout('/config/music.json');
    if (config.enabled !== false) createMusicPlayer(config);
  } catch (error) { console.warn('音乐配置加载失败；不影响正文。', error); }
}
