import { safeUrl, isExternalUrl } from './lib/urls.js?v=1.0';
import { loadConfig } from './lib/http.js?v=1.0';
import { contentRendered } from './lib/dom.js?v=1.0';
import { initPageEffects } from './page-effects.js?v=1.0';

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
    const config = await loadConfig('site');
    const nav = Array.isArray(config.nav) ? config.nav.filter(item => item && typeof item.label === 'string') : defaultSite.nav;
    const footer = { ...defaultSite.footer, ...config.footer };
    if (!Array.isArray(footer.groups)) footer.groups = defaultSite.footer.groups;
    footer.groups = footer.groups.filter(group => group && Array.isArray(group.links));
    return { ...defaultSite, ...config, nav, footer };
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

function makeLink(item, current) {
  const a = document.createElement('a');
  const href = safeUrl(item.href, '#');
  a.href = href;
  a.textContent = item.label;
  if (isExternalUrl(href)) {
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
  const repoHref = safeUrl(repo?.href, '');
  if (repoHref) {
    const repoLink = document.createElement('a');
    repoLink.className = 'nav__icon nav__icon--github';
    repoLink.href = repoHref;
    if (isExternalUrl(repoHref)) {
      repoLink.target = '_blank';
      repoLink.rel = 'noreferrer';
    }
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
  note.textContent = String(site.footer?.note || defaultSite.footer.note).replace('{year}', new Date().getFullYear());

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
    (group.links || []).filter(item => item && typeof item.label === 'string').forEach(item => links.append(makeLink(item, '')));
    section.append(title, links);
    groups.append(section);
  });

  inner.append(identity, groups);

  const children = [inner];
  const beian = site.footer?.beian;
  if (beian?.label && beian?.href) {
    const beianRow = document.createElement('div');
    beianRow.className = 'wrap footer__beian';
    beianRow.append(makeLink(beian, ''));
    children.push(beianRow);
  }

  footer.replaceChildren(...children);
}

// Navigation stays usable even while site.json is slow or unavailable.
renderHeader(defaultSite);
renderFooter(defaultSite);
initPageEffects();
import('./music-player.js?v=1.1').then(module => module.initMusicPlayer()).catch(error => console.warn('音乐播放器未能加载。', error));
loadSiteConfig().then(site => {
  renderHeader(site);
  renderFooter(site);
  contentRendered();
}).catch(error => console.warn('导航加载失败。', error));
