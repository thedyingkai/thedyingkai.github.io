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
    const state = {
      id,
      index: Number(ap.list?.index || 0),
      currentTime: Number(ap.audio.currentTime || 0),
      paused: Boolean(ap.audio.paused),
      volume: Number(ap.audio.volume || 0.45),
      settings: {
        ...settings,
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
    const lrcVisible = config.lrcVisible !== false;
    const volume = Number.isFinite(savedState?.volume) ? savedState.volume : Number(config.volume ?? 0.45);
    return { order, loop, lrcVisible, volume: Math.max(0, Math.min(1, volume)) };
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
    applyLyricVisibility(ap, settings.lrcVisible);
  }

  function timeLabel(seconds) {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const minutes = Math.floor(safe / 60);
    const rest = Math.floor(safe % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  function dockButton(text, title, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `music-dock__button${className ? ` ${className}` : ''}`;
    button.textContent = text;
    button.title = title;
    button.setAttribute('aria-label', title);
    return button;
  }

  function renderMusicDock(id, ap, settings, save) {
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

    main.append(meta, progressRow);

    const controls = document.createElement('div');
    controls.className = 'music-dock__controls';
    const prev = dockButton('‹', '上一首');
    const play = dockButton('▶', '播放或暂停', 'music-dock__button--play');
    const next = dockButton('›', '下一首');
    const list = dockButton('列表', '打开或收起播放列表');
    const order = dockButton('随机', '切换顺序或随机播放');
    const loop = dockButton('循环', '切换循环模式');
    const lrc = dockButton('歌词', '打开或关闭歌词');
    const volume = document.createElement('input');
    volume.className = 'music-dock__volume';
    volume.type = 'range';
    volume.min = '0';
    volume.max = '1';
    volume.step = '0.01';
    volume.value = String(settings.volume);
    volume.setAttribute('aria-label', '音量');
    controls.append(prev, play, next, list, order, loop, lrc, volume);

    dock.append(cover, main, controls);
    document.body.append(dock);

    let seeking = false;

    const syncTrack = () => {
      const audio = ap.list?.audios?.[ap.list.index] || {};
      title.textContent = audio.name || audio.title || '未知曲目';
      artist.textContent = audio.artist || audio.author || '未知艺术家';
      cover.style.backgroundImage = audio.cover ? `url("${String(audio.cover).replace(/"/g, '\\"')}")` : '';
    };

    const syncButtons = () => {
      play.textContent = ap.audio.paused ? '▶' : 'Ⅱ';
      play.setAttribute('aria-pressed', String(!ap.audio.paused));
      dock.classList.toggle('is-playing', !ap.audio.paused);
      const listNode = ap.template?.list || ap.container?.querySelector?.('.aplayer-list');
      const listOpen = listNode ? !listNode.classList.contains('aplayer-list-hide') : false;
      list.setAttribute('aria-pressed', String(listOpen));
      order.textContent = settings.order === 'random' ? '随机' : '顺序';
      order.setAttribute('aria-pressed', String(settings.order === 'random'));
      const loopLabel = { all: '列表循环', one: '单曲循环', none: '播完停止' }[settings.loop] || '列表循环';
      loop.textContent = loopLabel;
      loop.setAttribute('aria-pressed', String(settings.loop !== 'none'));
      lrc.textContent = settings.lrcVisible ? '歌词' : '歌词关';
      lrc.setAttribute('aria-pressed', String(settings.lrcVisible));
    };

    const syncProgress = () => {
      const total = ap.duration || ap.audio.duration || 0;
      const now = ap.audio.currentTime || 0;
      const pct = total > 0 ? Math.max(0, Math.min(100, now / total * 100)) : 0;
      if (!seeking) progress.value = total > 0 ? String(Math.round(pct * 10)) : '0';
      progress.style.setProperty('--progress', `${pct}%`);
      current.textContent = timeLabel(now);
      duration.textContent = timeLabel(total);
    };

    const syncVolume = () => {
      const value = Number(ap.audio.volume || 0);
      volume.value = String(value);
      volume.style.setProperty('--volume', `${Math.max(0, Math.min(1, value)) * 100}%`);
    };

    const syncAll = () => {
      syncTrack();
      syncButtons();
      syncProgress();
      syncVolume();
    };

    prev.addEventListener('click', () => {
      const wasPaused = ap.audio.paused;
      ap.skipBack();
      if (!wasPaused) ap.play();
    });

    play.addEventListener('click', () => ap.toggle());

    next.addEventListener('click', () => {
      const wasPaused = ap.audio.paused;
      ap.skipForward();
      if (!wasPaused) ap.play();
    });

    list.addEventListener('click', () => {
      ap.list?.toggle?.();
      setTimeout(syncButtons, 60);
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
      save();
    });

    volume.addEventListener('input', () => {
      settings.volume = Number(volume.value);
      ap.volume(settings.volume);
      save();
    });

    progress.addEventListener('input', () => {
      seeking = true;
      const total = ap.duration || ap.audio.duration || 0;
      const target = total * Number(progress.value) / 1000;
      progress.style.setProperty('--progress', `${Math.max(0, Math.min(100, Number(progress.value) / 10))}%`);
      current.textContent = timeLabel(target);
    });

    progress.addEventListener('change', () => {
      const total = ap.duration || ap.audio.duration || 0;
      if (total > 0) ap.seek(total * Number(progress.value) / 1000);
      seeking = false;
      syncProgress();
      save();
    });

    ap.on?.('play', syncButtons);
    ap.on?.('pause', syncButtons);
    ap.on?.('timeupdate', syncProgress);
    ap.on?.('durationchange', syncProgress);
    ap.on?.('loadedmetadata', syncProgress);
    ap.on?.('listswitch', syncAll);
    ap.audio.addEventListener('timeupdate', syncProgress);
    ap.audio.addEventListener('durationchange', syncProgress);
    ap.audio.addEventListener('loadedmetadata', syncProgress);
    ap.audio.addEventListener('volumechange', syncVolume);

    syncAll();
    return dock;
  }

  function bindMusicState(id, ap, config, savedState) {
    const settings = musicSettings(config, savedState);
    let restoring = true;
    let saveTimer = 0;

    const saveNow = () => saveMusicState(id, ap, settings);
    const saveSoon = () => {
      if (restoring) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveNow, 240);
    };
    const keepLyricsVisible = () => {
      if (!settings.lrcVisible) return;
      setTimeout(() => applyLyricVisibility(ap, true), 120);
    };

    applyMusicSettings(ap, settings);

    if (Number.isFinite(savedState?.index)) {
      ap.list.switch(Math.max(0, Math.min(savedState.index, ap.list.audios.length - 1)));
    }

    ap.on?.('play', saveSoon);
    ap.on?.('pause', saveSoon);
    ap.on?.('listswitch', () => {
      keepLyricsVisible();
      saveSoon();
    });
    ap.on?.('loadedmetadata', keepLyricsVisible);
    ap.template?.order?.addEventListener?.('click', () => {
      settings.order = ['list', 'random'].includes(ap.options?.order) ? ap.options.order : settings.order;
      saveSoon();
    });
    ap.template?.loop?.addEventListener?.('click', () => {
      settings.loop = ['all', 'one', 'none'].includes(ap.options?.loop) ? ap.options.loop : settings.loop;
      saveSoon();
    });
    ap.audio.addEventListener('volumechange', () => {
      settings.volume = Number(ap.audio.volume || settings.volume);
      saveSoon();
    });
    addEventListener('pagehide', saveNow);
    setTimeout(() => {
      restoring = false;
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

  loadSiteConfig().then(site => {
    renderHeader(site);
    renderFooter(site);
    setProgress();
    schedulePageMotion();
  });
  initMusicPlayer();
  addEventListener('tdk:content-rendered', schedulePageMotion);
  schedulePageMotion();
  setProgress();
  addEventListener('scroll', setProgress, { passive: true });
})();
