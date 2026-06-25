(() => {
  const root = document.documentElement;
  const progressBar = document.querySelector('.progress');
  const defaultSite = {
    brand: 'TDK 的小窝',
    brandSub: 'thedyingkai_',
    nav: [
      { href: '/', label: '首页', key: 'home' },
      { href: '/blog/', label: '文章', key: 'blog' },
      { href: '/projects/', label: '项目', key: 'projects' },
      { href: '/cloud/', label: '云盘', key: 'cloud' },
      { href: '/about/', label: '关于', key: 'about' }
    ],
    footer: {
      name: 'TDK 的小窝',
      note: '© {year} · thedyingkai_',
      groups: [
        {
          title: '站点',
          links: [
            { href: '/blog/', label: '文章' },
            { href: '/projects/', label: '项目' },
            { href: '/cloud/', label: '云盘' },
            { href: '/friends/', label: '友链' },
            { href: '/about/', label: '关于' }
          ]
        },
        {
          title: '联系',
          links: [
            { href: 'mailto:1474039695@qq.com', label: 'Email' },
            { href: 'https://github.com/thedyingkai', label: 'GitHub', external: true },
            { href: 'https://space.bilibili.com/646304256/', label: 'Bilibili', external: true }
          ]
        }
      ]
    },
    repo: {
      label: 'GitHub 仓库',
      href: 'https://github.com/thedyingkai/thedyingkai.github.io'
    }
  };

  async function loadSiteConfig() {
    try {
      const res = await fetch(`/config/site.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`config/site.json ${res.status}`);
      return { ...defaultSite, ...await res.json() };
    } catch {
      return defaultSite;
    }
  }

  function normalizedPath() {
    const path = location.pathname.replace(/\/index\.html$/, '/');
    return path.endsWith('/') ? path : `${path}/`;
  }

  function activeKey() {
    const path = normalizedPath();
    if (path === '/') return 'home';
    if (path.startsWith('/blog/')) return 'blog';
    if (path.startsWith('/projects/')) return 'projects';
    if (path.startsWith('/cloud/')) return 'cloud';
    if (path.startsWith('/friends/')) return 'friends';
    if (path.startsWith('/about/')) return 'about';
    return '';
  }

  function setProgress() {
    if (!progressBar) return;
    const max = root.scrollHeight - root.clientHeight;
    const progress = max <= 0 ? 0 : root.scrollTop / max * 100;
    progressBar.style.width = `${progress}%`;
  }

  function makeLink(item, current) {
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    if (item.external) {
      a.target = '_blank';
      a.rel = 'noreferrer';
    }
    if (item.key && item.key === current) {
      a.className = 'is-active';
      a.setAttribute('aria-current', 'page');
    }
    return a;
  }

  function githubIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z"/>';
    return svg;
  }

  function renderHeader(site) {
    const header = document.querySelector('[data-site-header]');
    if (!header) return;
    header.className = 'topbar';

    const inner = document.createElement('div');
    inner.className = 'wrap topbar__inner';

    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = '/';
    brand.setAttribute('aria-label', `${site.brand}首页`);

    const brandMark = document.createElement('span');
    brandMark.className = 'brand__mark';
    brandMark.append(document.createTextNode(site.brand || defaultSite.brand));

    const brandDot = document.createElement('span');
    brandDot.className = 'brand__dot';
    brandDot.textContent = '.';
    brandMark.append(brandDot);

    const brandSub = document.createElement('span');
    brandSub.className = 'brand__sub';
    brandSub.textContent = site.brandSub || '';

    brand.append(brandMark, brandSub);

    const nav = document.createElement('nav');
    nav.className = 'nav';
    nav.setAttribute('aria-label', '主导航');
    const current = activeKey();
    (site.nav || defaultSite.nav).forEach(item => nav.append(makeLink(item, current)));
    const repo = site.repo || defaultSite.repo;
    if (repo?.href) {
      const repoLink = document.createElement('a');
      repoLink.className = 'nav__icon nav__icon--github';
      repoLink.href = repo.href;
      repoLink.target = '_blank';
      repoLink.rel = 'noreferrer';
      repoLink.title = repo.label || 'GitHub';
      repoLink.setAttribute('aria-label', repo.label || 'GitHub');
      repoLink.append(githubIcon());
      nav.append(repoLink);
    }

    inner.append(brand, nav);
    header.replaceChildren(inner);
  }

  function renderFooter(site) {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return;
    footer.className = 'footer';

    const inner = document.createElement('div');
    inner.className = 'wrap footer__inner';

    const identity = document.createElement('div');
    identity.className = 'footer__identity';

    const name = document.createElement('strong');
    name.textContent = site.footer?.name || site.brand;

    const note = document.createElement('span');
    note.textContent = (site.footer?.note || defaultSite.footer.note).replace('{year}', new Date().getFullYear());

    identity.append(name, note);

    const groups = document.createElement('div');
    groups.className = 'footer__groups';
    const footerGroups = site.footer?.groups || (
      site.footer?.links ? [{ title: 'Links', links: site.footer.links }] : defaultSite.footer.groups
    );
    footerGroups.forEach(group => {
      const section = document.createElement('section');
      section.className = 'footer__group';
      const title = document.createElement('p');
      title.textContent = group.title;
      const links = document.createElement('nav');
      links.setAttribute('aria-label', group.title);
      (group.links || []).forEach(item => links.append(makeLink(item, '')));
      section.append(title, links);
      groups.append(section);
    });

    inner.append(identity, groups);
    footer.replaceChildren(inner);
  }

  function initPageMotion() {
    const candidates = [
      ...document.querySelectorAll('.page-head, .section-head, .card, .stat-card, .anime-frame, .timeline__item, .post-tools, .friend-exchange__panel, .friend-exchange__steps li')
    ].filter(node => !node.dataset.revealReady);
    if (!candidates.length) return;
    document.body.classList.add('motion-ready');

    if (!('IntersectionObserver' in window)) {
      candidates.forEach(node => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .12 });

    candidates.forEach((node, index) => {
      node.dataset.revealReady = '1';
      node.classList.add('reveal-item');
      node.style.setProperty('--reveal-delay', `${Math.min(index % 8, 7) * 45}ms`);
      observer.observe(node);
    });
  }

  function schedulePageMotion() {
    initPageMotion();
    setTimeout(initPageMotion, 450);
    setTimeout(initPageMotion, 1000);
  }

  function loadStyleOnce(href) {
    if ([...document.styleSheets].some(sheet => sheet.href === href)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      const siteStyle = href.includes('aplayer') ? document.querySelector('link[href^="/assets/site.css"]') : null;
      document.head.insertBefore(link, siteStyle || null);
    });
  }

  function loadScriptOnce(src) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.append(script);
    });
  }

  function neteasePlaylistId(config) {
    const value = String(config?.playlistId || config?.playlistUrl || config?.id || '').trim();
    if (/^\d+$/.test(value)) return value;
    return value.match(/[?&]id=(\d+)/)?.[1] || '';
  }

  async function loadMusicConfig() {
    const res = await fetch(`/config/music.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`config/music.json ${res.status}`);
    return res.json();
  }

  function attr(node, name, value) {
    if (value == null || value === '') return;
    node.setAttribute(name, String(value));
  }

  function musicStateKey(id) {
    return `tdk-music:${id}`;
  }

  function readMusicState(id) {
    try {
      const state = JSON.parse(localStorage.getItem(musicStateKey(id)) || sessionStorage.getItem(musicStateKey(id)) || 'null');
      return state && state.id === id ? state : null;
    } catch {
      return null;
    }
  }

  function saveMusicState(id, ap, settings) {
    if (!ap?.audio) return;
    const track = currentTrack(ap);
    const audioVolume = Number(ap.audio.volume);
    const audioTime = Number(ap.audio.currentTime);
    const audioDuration = Number(ap.audio.duration || ap.duration);
    const state = {
      id,
      version: 2,
      index: track.index,
      currentUrl: normalizedAudioUrl(track.audio?.url || ap.audio.currentSrc || ap.audio.src || ''),
      currentTime: Number.isFinite(audioTime) ? audioTime : 0,
      duration: Number.isFinite(audioDuration) ? audioDuration : 0,
      paused: Boolean(ap.audio.paused),
      playing: !ap.audio.paused && !ap.audio.ended,
      ended: Boolean(ap.audio.ended),
      volume: Number.isFinite(audioVolume) ? audioVolume : Number(settings.volume || 0.45),
      muted: Boolean(ap.audio.muted),
      playbackRate: Number(ap.audio.playbackRate || 1),
      randomOrder: Array.isArray(ap.randomOrder) ? ap.randomOrder.slice() : null,
      listLength: ap.list?.audios?.length || 0,
      track: {
        name: track.audio?.name || track.audio?.title || '',
        artist: track.audio?.artist || track.audio?.author || '',
        cover: track.audio?.cover || track.audio?.pic || '',
        lrc: track.audio?.lrc || ''
      },
      settings: {
        ...settings,
        volume: Number.isFinite(audioVolume) ? audioVolume : Number(settings.volume || 0.45),
        muted: Boolean(ap.audio.muted),
        playbackRate: Number(ap.audio.playbackRate || 1),
        order: ['list', 'random'].includes(ap.options?.order) ? ap.options.order : settings.order,
        loop: ['all', 'one', 'none'].includes(ap.options?.loop) ? ap.options.loop : settings.loop
      },
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(musicStateKey(id), JSON.stringify(state));
      sessionStorage.setItem(musicStateKey(id), JSON.stringify(state));
    } catch { }
  }

  function waitForAPlayer(player) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        const ap = player.aplayer;
        if (ap?.audio && Array.isArray(ap.list?.audios) && ap.list.audios.length) return resolve(ap);
        if (Date.now() - start > 15000) return reject(new Error('APlayer not ready'));
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  function musicSettings(config, savedState) {
    const saved = savedState?.settings || {};
    const configuredOrder = ['list', 'random'].includes(config.order) ? config.order : 'random';
    const order = ['list', 'random'].includes(saved.order) ? saved.order : configuredOrder;
    const configuredLoop = ['all', 'one', 'none'].includes(config.loop) ? config.loop : 'all';
    const loop = ['all', 'one', 'none'].includes(saved.loop) ? saved.loop : configuredLoop;
    const lrcVisible = typeof saved.lrcVisible === 'boolean' ? saved.lrcVisible : config.lrcVisible !== false;
    const collapsed = saved.collapsed === true;
    const listVisible = saved.listVisible === true && !collapsed;
    const savedVolume = Number.isFinite(saved.volume) ? saved.volume : savedState?.volume;
    const volume = Number.isFinite(savedVolume) ? savedVolume : Number(config.volume ?? 0.45);
    const playbackRate = Number.isFinite(saved.playbackRate) ? saved.playbackRate : Number(savedState?.playbackRate || 1);
    return {
      order,
      loop,
      lrcVisible,
      collapsed,
      listVisible,
      muted: saved.muted === true || savedState?.muted === true,
      playbackRate: Number.isFinite(playbackRate) ? playbackRate : 1,
      volume: Math.max(0, Math.min(1, volume))
    };
  }

  function showAPlayerLyrics(ap) {
    document.body.classList.remove('music-lrc-off');
    ap?.lrc?.show?.();
    ap?.template?.lrcButton?.classList.remove('aplayer-icon-lrc-inactivity');
  }

  function applyLyricVisibility(ap, visible) {
    document.body.classList.toggle('music-lrc-off', !visible);
    if (visible) {
      ap?.lrc?.show?.();
      ap?.template?.lrcButton?.classList.remove('aplayer-icon-lrc-inactivity');
    } else {
      ap?.lrc?.hide?.();
      ap?.template?.lrcButton?.classList.add('aplayer-icon-lrc-inactivity');
    }
  }

  function applyMusicSettings(ap, settings) {
    ap.options.order = settings.order;
    ap.options.loop = ['all', 'one', 'none'].includes(settings.loop) ? settings.loop : 'all';
    if (Number.isFinite(settings.volume)) ap.audio.volume = settings.volume;
    ap.audio.muted = settings.muted === true;
    if (Number.isFinite(settings.playbackRate) && settings.playbackRate > 0) ap.audio.playbackRate = settings.playbackRate;
    applyLyricVisibility(ap, settings.lrcVisible);
  }

  function timeLabel(seconds) {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const minutes = Math.floor(safe / 60);
    const rest = Math.floor(safe % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  function normalizedAudioUrl(value) {
    try {
      return new URL(value || '', location.href).href.split('#')[0];
    } catch {
      return String(value || '').split('#')[0];
    }
  }

  function currentTrack(ap) {
    const audios = ap.list?.audios || [];
    const listIndex = Number.isFinite(ap.list?.index) ? ap.list.index : 0;
    const currentSrc = normalizedAudioUrl(ap.audio?.currentSrc || ap.audio?.src || '');
    const srcIndex = currentSrc
      ? audios.findIndex(item => normalizedAudioUrl(item.url) === currentSrc)
      : -1;
    const index = srcIndex >= 0 ? srcIndex : Math.max(0, Math.min(listIndex, audios.length - 1));
    return { index, audio: audios[index] || {} };
  }

  function parseLrc(text) {
    const lines = [];
    String(text || '').split(/\r?\n/).forEach(row => {
      const stamps = [...row.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
      if (!stamps.length) return;
      const lyric = row.replace(/\[[^\]]+\]/g, '').trim();
      stamps.forEach(match => {
        const milliseconds = Number(`0.${(match[3] || '0').padEnd(3, '0').slice(0, 3)}`);
        lines.push([Number(match[1]) * 60 + Number(match[2]) + milliseconds, lyric]);
      });
    });
    return lines.sort((a, b) => a[0] - b[0]);
  }

  function rangeFill(input, percent) {
    input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, percent))}%`);
  }

  const musicIconPaths = {
    play: '<polygon points="6 4 20 12 6 20 6 4"></polygon>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>',
    'skip-back': '<polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="5" x2="5" y2="19"></line>',
    'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>',
    list: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle>',
    'list-ordered': '<line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M4 14h2l-2 4h2"></path>',
    shuffle: '<path d="M16 3h5v5"></path><path d="M4 20l5.6-5.6"></path><path d="M15 4l6 6"></path><path d="M4 4l5 5"></path><path d="M14 15l7 7"></path><path d="M16 21h5v-5"></path>',
    repeat: '<path d="M17 2l4 4-4 4"></path><path d="M3 11V9a3 3 0 0 1 3-3h15"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a3 3 0 0 1-3 3H3"></path>',
    'repeat-one': '<path d="M17 2l4 4-4 4"></path><path d="M3 11V9a3 3 0 0 1 3-3h15"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a3 3 0 0 1-3 3H3"></path><path d="M12 10h1v5"></path>',
    'repeat-off': '<path d="M17 2l4 4-4 4"></path><path d="M3 11V9a3 3 0 0 1 3-3h11"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a3 3 0 0 1-3 3H7"></path><line x1="3" y1="3" x2="21" y2="21"></line>',
    lyrics: '<path d="M9 18V5l11-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="17" cy="16" r="3"></circle><line x1="9" y1="9" x2="20" y2="7"></line>',
    'lyrics-off': '<path d="M9 18V5l11-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="17" cy="16" r="3"></circle><line x1="3" y1="3" x2="21" y2="21"></line>',
    'volume-2': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15 9.5a4 4 0 0 1 0 5"></path><path d="M17.7 6.8a8 8 0 0 1 0 10.4"></path>',
    'volume-x': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="16" y1="9" x2="22" y2="15"></line><line x1="22" y1="9" x2="16" y2="15"></line>',
    'chevron-down': '<path d="M6 9l6 6 6-6"></path>',
    'chevron-up': '<path d="M6 15l6-6 6 6"></path>'
  };

  const musicIconAliases = {
    '上一首': 'skip-back',
    '下一首': 'skip-forward',
    '播放': 'play',
    '暂停': 'pause',
    '列表': 'list',
    '随机': 'shuffle',
    '顺序': 'list-ordered',
    '循环': 'repeat',
    '列表循环': 'repeat',
    '单曲': 'repeat-one',
    '不循环': 'repeat-off',
    '歌词': 'lyrics',
    '无歌词': 'lyrics-off',
    '歌词关': 'lyrics-off',
    '静音': 'volume-x',
    '恢复': 'volume-2',
    '收起': 'chevron-down',
    '展开': 'chevron-up',
    '‹': 'skip-back',
    '›': 'skip-forward',
    '▶': 'play',
    'Ⅱ': 'pause'
  };

  function musicIcon(name) {
    const key = musicIconAliases[name] || name;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = musicIconPaths[key] || musicIconPaths.play;
    return svg;
  }

  function setDockButtonIcon(button, icon, label) {
    button.replaceChildren(musicIcon(icon));
    if (label) {
      button.title = label;
      button.setAttribute('aria-label', label);
    }
  }

  function dockButton(icon, title, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `music-dock__button${className ? ` ${className}` : ''}`;
    button.title = title;
    button.setAttribute('aria-label', title);
    setDockButtonIcon(button, icon, title);
    return button;
  }

  function renderMusicPanel(id, ap, settings, save) {
    document.querySelector('[data-music-dock]')?.remove();
    document.body.classList.add('music-dock-ready');

    const dock = document.createElement('section');
    dock.className = 'music-dock';
    dock.dataset.musicDock = id;
    dock.setAttribute('aria-label', '音乐播放器');

    const cover = document.createElement('div');
    cover.className = 'music-dock__cover';

    const main = document.createElement('div');
    main.className = 'music-dock__main';

    const meta = document.createElement('div');
    meta.className = 'music-dock__meta';
    const title = document.createElement('strong');
    const artist = document.createElement('span');
    meta.append(title, artist);

    const progressRow = document.createElement('div');
    progressRow.className = 'music-dock__progress';
    const current = document.createElement('span');
    current.textContent = '0:00';
    const progress = document.createElement('input');
    progress.type = 'range';
    progress.min = '0';
    progress.max = '1000';
    progress.step = '1';
    progress.value = '0';
    progress.setAttribute('aria-label', '播放进度');
    const duration = document.createElement('span');
    duration.textContent = '0:00';
    progressRow.append(current, progress, duration);

    const lyricBox = document.createElement('button');
    lyricBox.type = 'button';
    lyricBox.className = 'music-dock__lyrics';
    lyricBox.setAttribute('aria-label', '切换歌词显示');
    const lyricLine = document.createElement('span');
    lyricLine.textContent = '歌词加载中';
    const lyricNext = document.createElement('small');
    lyricBox.append(lyricLine, lyricNext);

    main.append(meta, progressRow, lyricBox);

    const controls = document.createElement('div');
    controls.className = 'music-dock__controls';
    const prev = dockButton('上一首', '上一首');
    const play = dockButton('播放', '播放或暂停', 'music-dock__button--play');
    const next = dockButton('下一首', '下一首');
    const list = dockButton('列表', '打开或收起播放列表');
    const order = dockButton('随机', '切换顺序或随机播放');
    const loop = dockButton('循环', '切换循环模式');
    const lrc = dockButton('歌词', '打开或关闭歌词');
    const mute = dockButton('静音', '静音或恢复音量');
    const volume = document.createElement('input');
    volume.className = 'music-dock__volume';
    volume.type = 'range';
    volume.min = '0';
    volume.max = '1';
    volume.step = '0.01';
    volume.value = String(settings.volume);
    volume.setAttribute('aria-label', '音量');
    const fold = dockButton('收起', '折叠或展开播放器', 'music-dock__button--fold');
    controls.append(prev, play, next, list, order, loop, lrc, mute, volume, fold);

    const playlist = document.createElement('div');
    playlist.className = 'music-dock__list';
    playlist.setAttribute('aria-label', '播放列表');

    dock.append(cover, main, controls, playlist);
    document.body.append(dock);

    let seeking = false;
    let lastLyricText = '';
    let lyricKey = '';
    let activeLyrics = [];
    let lyricRequest = 0;
    const lyricCache = new Map();

    const lyricAt = () => {
      const lines = activeLyrics.length ? activeLyrics : (Array.isArray(ap.lrc?.current) ? ap.lrc.current : []);
      if (!lines.length) return { text: ap.audio.readyState ? '暂无歌词' : '歌词加载中', next: '' };
      const now = ap.audio.currentTime || 0;
      let index = 0;
      for (let i = 0; i < lines.length; i += 1) {
        if (now >= Number(lines[i][0] || 0)) index = i;
        else break;
      }
      return {
        text: String(lines[index]?.[1] || '').trim() || '♪',
        next: String(lines[index + 1]?.[1] || '').trim()
      };
    };

    const loadLyricsForCurrent = async () => {
      const { index, audio } = currentTrack(ap);
      const key = audio.lrc || audio.url || String(index);
      if (!key) return;
      if (key === lyricKey && activeLyrics.length) return;
      if (key !== lyricKey) {
        lyricKey = key;
        activeLyrics = [];
        lastLyricText = '';
        lyricLine.textContent = '歌词加载中';
        lyricNext.textContent = '';
      }

      if (lyricCache.has(key)) {
        activeLyrics = lyricCache.get(key);
        syncLyrics();
        return;
      }

      const requestId = ++lyricRequest;
      let lines = [];
      if (audio.lrc) {
        try {
          const res = await fetch(audio.lrc, { cache: 'force-cache' });
          if (res.ok) lines = parseLrc(await res.text());
        } catch { }
      }
      if (!lines.length && Array.isArray(ap.lrc?.current)) lines = ap.lrc.current;
      if (requestId !== lyricRequest) return;
      activeLyrics = lines;
      lyricCache.set(key, lines);
      syncLyrics();
    };

    const syncTrack = () => {
      const { audio } = currentTrack(ap);
      title.textContent = audio.name || audio.title || '未知曲目';
      artist.textContent = audio.artist || audio.author || '未知艺术家';
      cover.style.backgroundImage = audio.cover ? `url("${String(audio.cover).replace(/"/g, '\\"')}")` : '';
      loadLyricsForCurrent();
    };

    const syncLyrics = () => {
      const lyric = lyricAt();
      if (lyric.text !== lastLyricText) {
        lyricLine.textContent = lyric.text;
        lyricNext.textContent = lyric.next;
        lastLyricText = lyric.text;
      }
    };

    function syncAllSoon() {
      setTimeout(syncAll, 80);
      setTimeout(syncAll, 500);
      setTimeout(syncAll, 1200);
      setTimeout(syncAll, 2500);
      setTimeout(syncAll, 5000);
    }

    const renderPlaylist = () => {
      const audios = ap.list?.audios || [];
      const currentIndex = currentTrack(ap).index;
      playlist.replaceChildren(...audios.map((audio, index) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'music-dock__list-item';
        row.classList.toggle('is-active', index === currentIndex);
        row.setAttribute('aria-current', index === currentIndex ? 'true' : 'false');
        const name = document.createElement('span');
        name.textContent = audio.name || audio.title || `曲目 ${index + 1}`;
        const author = document.createElement('small');
        author.textContent = audio.artist || audio.author || '';
        row.append(name, author);
        row.addEventListener('click', () => {
          switchTo(index, true);
          settings.listVisible = false;
          syncAllSoon();
          save();
        });
        return row;
      }));
    };

    const syncButtons = () => {
      dock.classList.toggle('is-playing', !ap.audio.paused);
      dock.classList.toggle('is-collapsed', settings.collapsed);
      dock.classList.toggle('is-list-open', settings.listVisible && !settings.collapsed);
      dock.classList.toggle('is-lyrics-off', !settings.lrcVisible);
      setDockButtonIcon(play, ap.audio.paused ? 'play' : 'pause', ap.audio.paused ? '播放' : '暂停');
      play.setAttribute('aria-pressed', String(!ap.audio.paused));
      list.setAttribute('aria-pressed', String(settings.listVisible));
      setDockButtonIcon(order, settings.order === 'random' ? 'shuffle' : 'list-ordered', settings.order === 'random' ? '随机播放' : '顺序播放');
      order.setAttribute('aria-pressed', String(settings.order === 'random'));
      const loopLabels = { all: '列表循环', one: '单曲循环', none: '不循环' };
      const loopIcons = { all: 'repeat', one: 'repeat-one', none: 'repeat-off' };
      setDockButtonIcon(loop, loopIcons[settings.loop] || 'repeat', loopLabels[settings.loop] || '列表循环');
      loop.setAttribute('aria-pressed', String(settings.loop !== 'none'));
      setDockButtonIcon(lrc, settings.lrcVisible ? 'lyrics' : 'lyrics-off', settings.lrcVisible ? '关闭歌词' : '打开歌词');
      lrc.setAttribute('aria-pressed', String(settings.lrcVisible));
      setDockButtonIcon(mute, ap.audio.muted || ap.audio.volume === 0 ? 'volume-2' : 'volume-x', ap.audio.muted || ap.audio.volume === 0 ? '恢复音量' : '静音');
      mute.setAttribute('aria-pressed', String(ap.audio.muted || ap.audio.volume === 0));
      setDockButtonIcon(fold, settings.collapsed ? 'chevron-up' : 'chevron-down', settings.collapsed ? '展开播放器' : '收起播放器');
      fold.setAttribute('aria-pressed', String(settings.collapsed));
    };

    const syncProgress = () => {
      const total = ap.duration || ap.audio.duration || 0;
      const now = ap.audio.currentTime || 0;
      const pct = total > 0 ? Math.max(0, Math.min(100, now / total * 100)) : 0;
      if (!seeking) progress.value = total > 0 ? String(Math.round(pct * 10)) : '0';
      rangeFill(progress, pct);
      current.textContent = timeLabel(now);
      duration.textContent = timeLabel(total);
      syncLyrics();
    };

    const syncVolume = () => {
      const value = Number(ap.audio.volume || 0);
      volume.value = String(value);
      rangeFill(volume, Math.max(0, Math.min(1, value)) * 100);
      syncButtons();
    };

    function syncAll() {
      syncTrack();
      syncButtons();
      syncProgress();
      syncVolume();
      renderPlaylist();
    }

    const targetIndex = direction => {
      const audios = ap.list?.audios || [];
      const count = audios.length;
      if (count < 2) return 0;
      const currentIndex = currentTrack(ap).index;
      if (settings.order === 'random' && Array.isArray(ap.randomOrder) && ap.randomOrder.length === count) {
        const currentOrderIndex = Math.max(0, ap.randomOrder.indexOf(currentIndex));
        return ap.randomOrder[(currentOrderIndex + direction + count) % count];
      }
      return (currentIndex + direction + count) % count;
    };

    const switchTo = (index, shouldPlay = !ap.audio.paused) => {
      const audios = ap.list?.audios || [];
      if (!audios[index]) return;
      ap.list.switch(index);
      if (shouldPlay) setTimeout(() => ap.play(), 80);
      syncAllSoon();
      save();
    };

    prev.addEventListener('click', () => {
      switchTo(targetIndex(-1));
    });

    play.addEventListener('click', () => {
      if (ap.audio.paused) ap.play();
      else ap.pause();
    });

    next.addEventListener('click', () => {
      switchTo(targetIndex(1));
    });

    list.addEventListener('click', () => {
      settings.listVisible = !settings.listVisible;
      syncButtons();
      save();
    });

    order.addEventListener('click', () => {
      settings.order = settings.order === 'random' ? 'list' : 'random';
      ap.options.order = settings.order;
      syncButtons();
      save();
    });

    loop.addEventListener('click', () => {
      const modes = ['all', 'one', 'none'];
      settings.loop = modes[(modes.indexOf(settings.loop) + 1) % modes.length] || 'all';
      ap.options.loop = settings.loop;
      syncButtons();
      save();
    });

    lrc.addEventListener('click', () => {
      settings.lrcVisible = !settings.lrcVisible;
      applyLyricVisibility(ap, settings.lrcVisible);
      syncButtons();
      syncLyrics();
      save();
    });

    lyricBox.addEventListener('click', () => lrc.click());

    mute.addEventListener('click', () => {
      if (ap.audio.muted || ap.audio.volume === 0) {
        ap.audio.muted = false;
        ap.volume(settings.volume || 0.45);
      } else {
        settings.volume = Number(ap.audio.volume || settings.volume || 0.45);
        ap.audio.muted = true;
      }
      syncVolume();
      save();
    });

    volume.addEventListener('input', () => {
      settings.volume = Number(volume.value);
      ap.audio.muted = false;
      ap.volume(settings.volume);
      save();
    });

    progress.addEventListener('input', () => {
      seeking = true;
      const total = ap.duration || ap.audio.duration || 0;
      const target = total * Number(progress.value) / 1000;
      rangeFill(progress, Math.max(0, Math.min(100, Number(progress.value) / 10)));
      current.textContent = timeLabel(target);
    });

    progress.addEventListener('change', () => {
      const total = ap.duration || ap.audio.duration || 0;
      if (total > 0) ap.seek(total * Number(progress.value) / 1000);
      seeking = false;
      syncProgress();
      save();
    });

    fold.addEventListener('click', () => {
      settings.collapsed = !settings.collapsed;
      if (settings.collapsed) settings.listVisible = false;
      syncButtons();
      save();
    });

    ap.on?.('play', syncButtons);
    ap.on?.('pause', syncButtons);
    ap.on?.('timeupdate', syncProgress);
    ap.on?.('durationchange', syncProgress);
    ap.on?.('loadedmetadata', syncAll);
    ap.on?.('listswitch', syncAllSoon);
    ap.on?.('canplay', syncAll);
    ap.audio.addEventListener('timeupdate', syncProgress);
    ap.audio.addEventListener('durationchange', syncProgress);
    ap.audio.addEventListener('loadedmetadata', syncAll);
    ap.audio.addEventListener('playing', syncAll);
    ap.audio.addEventListener('canplay', syncAll);
    ap.audio.addEventListener('volumechange', syncVolume);

    applyLyricVisibility(ap, settings.lrcVisible);
    syncAll();
    syncAllSoon();
    return dock;
  }

  function savedTrackIndex(ap, savedState) {
    const audios = ap.list?.audios || [];
    const savedUrl = normalizedAudioUrl(savedState?.currentUrl || '');
    if (savedUrl) {
      const matched = audios.findIndex(audio => normalizedAudioUrl(audio.url) === savedUrl);
      if (matched >= 0) return matched;
    }
    if (Number.isFinite(savedState?.index)) return Math.max(0, Math.min(savedState.index, audios.length - 1));
    return 0;
  }

  function bindMusicState(id, ap, config, savedState) {
    const settings = musicSettings(config, savedState);
    let restoring = true;
    let saveTimer = 0;
    let lastProgressSave = 0;
    let restoredPosition = false;
    const shouldResume = savedState?.playing === true || savedState?.paused === false;

    const saveNow = () => saveMusicState(id, ap, settings);
    const saveSoon = () => {
      if (restoring) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveNow, 240);
    };
    const saveProgress = () => {
      if (restoring) return;
      const now = Date.now();
      if (now - lastProgressSave < 900) return;
      lastProgressSave = now;
      saveNow();
    };
    const keepLyricsVisible = () => {
      if (!settings.lrcVisible) return;
      setTimeout(() => applyLyricVisibility(ap, true), 120);
    };
    const resumePlayback = () => {
      if (!shouldResume || !ap.audio.paused) return;
      const result = ap.play?.();
      if (result?.catch) result.catch(() => {
        saveNow();
      });
    };
    const restorePosition = () => {
      if (restoredPosition) return;
      const savedTime = Number(savedState?.currentTime || 0);
      if (!Number.isFinite(savedTime) || savedTime <= 0) {
        restoredPosition = true;
        resumePlayback();
        return;
      }
      const duration = Number(ap.audio.duration || ap.duration || savedState?.duration || 0);
      const elapsed = shouldResume && Number.isFinite(savedState?.savedAt)
        ? Math.max(0, Math.min(30, (Date.now() - savedState.savedAt) / 1000))
        : 0;
      const target = duration > 1 ? Math.min(savedTime + elapsed, Math.max(0, duration - .8)) : savedTime + elapsed;
      try {
        ap.seek?.(target);
      } catch {
        try { ap.audio.currentTime = target; } catch { }
      }
      restoredPosition = true;
      setTimeout(resumePlayback, 80);
      setTimeout(saveNow, 500);
    };

    applyMusicSettings(ap, settings);
    if (Array.isArray(savedState?.randomOrder) && savedState.randomOrder.length === ap.list.audios.length) {
      ap.randomOrder = savedState.randomOrder.slice();
    }

    if (savedState) {
      ap.list.switch(savedTrackIndex(ap, savedState));
    }

    renderMusicPanel(id, ap, settings, saveNow);
    setTimeout(restorePosition, 180);
    setTimeout(restorePosition, 700);

    ap.on?.('play', saveSoon);
    ap.on?.('pause', saveSoon);
    ap.on?.('listswitch', () => {
      keepLyricsVisible();
      saveSoon();
    });
    ap.on?.('loadedmetadata', () => {
      keepLyricsVisible();
      restorePosition();
    });
    ap.on?.('canplay', restorePosition);
    ap.template?.order?.addEventListener?.('click', () => {
      settings.order = ['list', 'random'].includes(ap.options?.order) ? ap.options.order : settings.order;
      saveSoon();
    });
    ap.template?.loop?.addEventListener?.('click', () => {
      settings.loop = ['all', 'one', 'none'].includes(ap.options?.loop) ? ap.options.loop : settings.loop;
      saveSoon();
    });
    ap.audio.addEventListener('volumechange', () => {
      const value = Number(ap.audio.volume);
      settings.volume = Number.isFinite(value) ? value : settings.volume;
      settings.muted = ap.audio.muted;
      saveSoon();
    });
    ap.audio.addEventListener('timeupdate', saveProgress);
    ap.audio.addEventListener('seeked', saveNow);
    ap.audio.addEventListener('ratechange', () => {
      settings.playbackRate = Number(ap.audio.playbackRate || 1);
      saveSoon();
    });
    ap.audio.addEventListener('canplay', restorePosition);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) saveNow();
    });
    addEventListener('pagehide', saveNow);
    addEventListener('beforeunload', saveNow);
    setTimeout(() => {
      restoring = false;
      restorePosition();
      saveNow();
    }, 1200);
  }

  async function initMusicPlayer() {
    try {
      const config = await loadMusicConfig();
      if (config.enabled === false) return;
      const id = neteasePlaylistId(config);
      if (!id) return;
      document.querySelector('[data-music-panel]')?.remove();
      document.querySelector('[data-music-dock]')?.remove();
      document.body.classList.remove('music-dock-ready');
      document.body.classList.remove('music-lrc-off');
      const savedState = readMusicState(id);
      const savedSettings = musicSettings(config, savedState);

      await loadStyleOnce('https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.css');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.js');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/meting@2/dist/Meting.min.js');

      const player = document.createElement('meting-js');
      attr(player, 'server', config.server || 'netease');
      attr(player, 'type', config.type || 'playlist');
      attr(player, 'id', id);
      attr(player, 'fixed', config.fixed ?? true);
      attr(player, 'mini', config.mini ?? true);
      attr(player, 'autoplay', config.autoplay ?? false);
      attr(player, 'order', savedSettings.order === 'random' ? 'random' : 'list');
      attr(player, 'loop', ['all', 'one', 'none'].includes(savedSettings.loop) ? savedSettings.loop : 'all');
      attr(player, 'preload', config.preload || 'auto');
      attr(player, 'volume', savedSettings.volume);
      attr(player, 'theme', config.theme || '#66ccff');
      attr(player, 'lrc-type', config.lrcType ?? 3);
      attr(player, 'list-folded', config.listFolded ?? true);
      attr(player, 'list-max-height', config.listMaxHeight || '320px');
      document.body.append(player);
      bindMusicState(id, await waitForAPlayer(player), config, savedState);
    } catch {
      // Music is optional; the site should stay quiet if the config or CDN is unavailable.
    }
  }

  initMusicPlayer();
  loadSiteConfig().then(site => {
    renderHeader(site);
    renderFooter(site);
    setProgress();
    schedulePageMotion();
  });
  addEventListener('tdk:content-rendered', schedulePageMotion);
  schedulePageMotion();
  setProgress();
  addEventListener('scroll', setProgress, { passive: true });
})();
