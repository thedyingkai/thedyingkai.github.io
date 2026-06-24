(() => {
  const root = document.documentElement;
  const progressBar = document.querySelector('.progress');

  const navItems = [
    { href: '/', label: '首页', key: 'home' },
    { href: '/blog/', label: '文章', key: 'blog' },
    { href: '/projects/', label: '项目', key: 'projects' },
    { href: '/friends/', label: '友链', key: 'friends' },
    { href: '/about/', label: '关于', key: 'about' },
    { href: 'https://github.com/thedyingkai', label: 'GitHub', external: true }
  ];

  const footerItems = [
    { href: '/blog/', label: 'Blog' },
    { href: '/about/', label: 'About' },
    { href: 'mailto:1474039695@qq.com', label: 'Email' },
    { href: 'https://github.com/thedyingkai', label: 'GitHub', external: true },
    { href: 'https://atcoder.jp/users/thedyingkai_', label: 'AtCoder', external: true },
    { href: 'https://codeforces.com/profile/thedyingkai_', label: 'Codeforces', external: true }
  ];

  function normalizedPath() {
    const path = location.pathname.replace(/\/index\.html$/, '/');
    return path.endsWith('/') ? path : `${path}/`;
  }

  function activeKey() {
    const path = normalizedPath();
    if (path === '/') return 'home';
    if (path.startsWith('/blog/')) return 'blog';
    if (path.startsWith('/projects/')) return 'projects';
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

  function renderHeader() {
    const header = document.querySelector('[data-site-header]');
    if (!header) return;
    header.className = 'topbar';

    const inner = document.createElement('div');
    inner.className = 'wrap topbar__inner';

    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = '/';
    brand.setAttribute('aria-label', 'TDK 的小窝首页');
    brand.innerHTML = '<span class="brand__mark">TDK 的小窝<span class="brand__dot">.</span></span><span class="brand__sub">thedyingkai_</span>';

    const nav = document.createElement('nav');
    nav.className = 'nav';
    nav.setAttribute('aria-label', '主导航');
    const current = activeKey();
    navItems.forEach(item => nav.append(makeLink(item, current)));

    inner.append(brand, nav);
    header.replaceChildren(inner);
  }

  function renderFooter() {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return;
    footer.className = 'footer';

    const inner = document.createElement('div');
    inner.className = 'wrap footer__inner';

    const identity = document.createElement('div');
    identity.className = 'footer__identity';

    const name = document.createElement('strong');
    name.textContent = 'TDK 的小窝';

    const note = document.createElement('span');
    note.textContent = `© ${new Date().getFullYear()} · thedyingkai_ · QQ 1474039695`;

    identity.append(name, note);

    const links = document.createElement('nav');
    links.className = 'footer__links';
    links.setAttribute('aria-label', '页脚导航');
    footerItems.forEach(item => links.append(makeLink(item, '')));

    inner.append(identity, links);
    footer.replaceChildren(inner);
  }

  renderHeader();
  renderFooter();
  setProgress();
  addEventListener('scroll', setProgress, { passive: true });
})();
