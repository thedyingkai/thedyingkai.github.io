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
      { href: '/friends/', label: '友链', key: 'friends' },
      { href: '/about/', label: '关于', key: 'about' },
      { href: 'https://github.com/thedyingkai', label: 'GitHub', external: true }
    ],
    footer: {
      name: 'TDK 的小窝',
      note: '© {year} · thedyingkai_ · QQ 1474039695',
      links: [
        { href: '/blog/', label: 'Blog' },
        { href: '/cloud/', label: 'Cloud' },
        { href: '/about/', label: 'About' },
        { href: 'mailto:1474039695@qq.com', label: 'Email' },
        { href: 'https://github.com/thedyingkai', label: 'GitHub', external: true },
        { href: 'https://atcoder.jp/users/thedyingkai_', label: 'AtCoder', external: true },
        { href: 'https://codeforces.com/profile/thedyingkai_', label: 'Codeforces', external: true }
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

    const links = document.createElement('nav');
    links.className = 'footer__links';
    links.setAttribute('aria-label', '页脚导航');
    (site.footer?.links || defaultSite.footer.links).forEach(item => links.append(makeLink(item, '')));

    inner.append(identity, links);
    footer.replaceChildren(inner);
  }

  loadSiteConfig().then(site => {
    renderHeader(site);
    renderFooter(site);
    setProgress();
  });
  setProgress();
  addEventListener('scroll', setProgress, { passive: true });
})();
