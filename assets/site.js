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

  async function initMusicPlayer() {
    try {
      const config = await loadMusicConfig();
      if (config.enabled === false) return;
      const id = neteasePlaylistId(config);
      if (!id) return;

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
      attr(player, 'order', config.order || 'random');
      attr(player, 'loop', config.loop || 'all');
      attr(player, 'preload', config.preload || 'none');
      attr(player, 'volume', config.volume ?? 0.45);
      attr(player, 'theme', config.theme || '#66ccff');
      attr(player, 'list-folded', config.listFolded ?? true);
      attr(player, 'list-max-height', config.listMaxHeight || '320px');
      document.body.append(player);
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
