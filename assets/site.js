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

  function loadStyleOnce(href) {
    if ([...document.styleSheets].some(sheet => sheet.href === href)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.append(link);
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
      settings: { ...settings },
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
    const order = ['list', 'reverse', 'random'].includes(saved.order) ? saved.order : (config.order || 'random');
    const loop = saved.loop === 'one' ? 'one' : 'all';
    const lrcVisible = saved.lrcVisible !== false;
    const volume = Number.isFinite(savedState?.volume) ? savedState.volume : Number(config.volume ?? 0.45);
    return { order, loop, lrcVisible, volume: Math.max(0, Math.min(1, volume)) };
  }

  function applyMusicSettings(ap, settings) {
    ap.options.order = settings.order === 'random' ? 'random' : 'list';
    ap.options.loop = settings.loop === 'one' ? 'one' : 'all';
    if (Number.isFinite(settings.volume)) ap.audio.volume = settings.volume;
    document.body.classList.toggle('music-lrc-off', !settings.lrcVisible);
  }

  function musicButton(text, pressed) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-pressed', String(Boolean(pressed)));
    return button;
  }

  function renderMusicPanel(id, ap, settings, save) {
    document.querySelector('[data-music-panel]')?.remove();
    const panel = document.createElement('div');
    panel.className = 'music-panel';
    panel.dataset.musicPanel = id;

    const orderLabel = { list: '顺序', reverse: '倒序', random: '随机' };
    const orderButton = musicButton(orderLabel[settings.order] || '顺序', false);
    const loopButton = musicButton(settings.loop === 'one' ? '单曲' : '列表', settings.loop === 'one');
    const lrcButton = musicButton(settings.lrcVisible ? '歌词开' : '歌词关', settings.lrcVisible);
    const volume = document.createElement('input');
    volume.type = 'range';
    volume.min = '0';
    volume.max = '1';
    volume.step = '0.01';
    volume.value = String(settings.volume);
    volume.setAttribute('aria-label', '音乐音量');

    const setOrder = value => {
      settings.order = value;
      orderButton.textContent = orderLabel[value] || '顺序';
      applyMusicSettings(ap, settings);
      save();
    };

    orderButton.addEventListener('click', () => {
      const modes = ['list', 'reverse', 'random'];
      setOrder(modes[(modes.indexOf(settings.order) + 1) % modes.length]);
    });

    loopButton.addEventListener('click', () => {
      settings.loop = settings.loop === 'one' ? 'all' : 'one';
      loopButton.textContent = settings.loop === 'one' ? '单曲' : '列表';
      loopButton.setAttribute('aria-pressed', String(settings.loop === 'one'));
      applyMusicSettings(ap, settings);
      save();
    });

    lrcButton.addEventListener('click', () => {
      settings.lrcVisible = !settings.lrcVisible;
      lrcButton.textContent = settings.lrcVisible ? '歌词开' : '歌词关';
      lrcButton.setAttribute('aria-pressed', String(settings.lrcVisible));
      applyMusicSettings(ap, settings);
      save();
    });

    volume.addEventListener('input', () => {
      settings.volume = Number(volume.value);
      applyMusicSettings(ap, settings);
      save();
    });

    panel.append(orderButton, loopButton, lrcButton, volume);
    document.body.append(panel);
  }

  function bindMusicState(id, ap, config, savedState) {
    const settings = musicSettings(config, savedState);
    let restoring = true;
    let saveTimer = 0;
    let lastSecond = -1;

    const saveNow = () => saveMusicState(id, ap, settings);
    const saveSoon = () => {
      if (restoring) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveNow, 240);
    };

    applyMusicSettings(ap, settings);

    if (Number.isFinite(savedState?.index)) {
      ap.list.switch(Math.max(0, Math.min(savedState.index, ap.list.audios.length - 1)));
    } else if (settings.order === 'random') {
      ap.list.switch(Math.floor(Math.random() * ap.list.audios.length));
    }

    const resumeTime = Number(savedState?.currentTime || 0);
    if (resumeTime > 1) {
      const seek = () => {
        if (Number.isFinite(ap.audio.duration) && resumeTime < ap.audio.duration - 1) ap.seek(resumeTime);
      };
      ap.audio.addEventListener('loadedmetadata', seek, { once: true });
      setTimeout(seek, 500);
    }

    if (savedState && !savedState.paused) {
      setTimeout(() => {
        const result = ap.play();
        result?.catch?.(() => {});
      }, 700);
    }

    renderMusicPanel(id, ap, settings, saveNow);

    ap.on?.('play', saveSoon);
    ap.on?.('pause', saveSoon);
    ap.on?.('listswitch', saveSoon);
    ap.audio.addEventListener('timeupdate', () => {
      const second = Math.floor(ap.audio.currentTime || 0);
      if (second !== lastSecond && second % 3 === 0) {
        lastSecond = second;
        saveSoon();
      }
    });
    ap.audio.addEventListener('volumechange', () => {
      settings.volume = Number(ap.audio.volume || settings.volume);
      saveSoon();
    });
    ap.audio.addEventListener('ended', () => {
      if (settings.order !== 'reverse' || settings.loop === 'one') return;
      const from = Number(ap.list?.index || 0);
      setTimeout(() => {
        const target = (from - 1 + ap.list.audios.length) % ap.list.audios.length;
        ap.list.switch(target);
        ap.play()?.catch?.(() => {});
      }, 120);
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
      attr(player, 'loop', savedSettings.loop === 'one' ? 'one' : 'all');
      attr(player, 'preload', config.preload || 'metadata');
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
  });
  initMusicPlayer();
  setProgress();
  addEventListener('scroll', setProgress, { passive: true });
})();
