import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFolderIndex, resourceUrl } from '../assets/cloud-model.js';
import { timelineEntries } from '../assets/timeline-model.js';
import { safeUrl, imageUrl } from '../assets/lib/urls.js';
import { buildSiteData, projectRoot } from './generate-site-data.mjs';
import { publicDirectories, publicFiles, walkFiles } from './site-files.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const array = (value, name) => assert(Array.isArray(value), `${name} must be an array`);

export async function validateSite(root = projectRoot) {
  const config = {};
  for (const name of ['site', 'home', 'about', 'projects', 'friends', 'images', 'music', 'cloud', 'asset-versions']) {
    config[name] = JSON.parse(await readFile(path.join(root, `config/${name}.json`), 'utf8'));
    assert(config[name] && typeof config[name] === 'object' && !Array.isArray(config[name]), `${name} must be an object`);
  }
  for (const [name, fields] of Object.entries({ site: ['nav'], home: ['actions', 'stats'], about: ['cards', 'timeline'], projects: ['featured', 'directions'], friends: ['links', 'apply'], cloud: ['folders', 'actions', 'notes'] })) {
    for (const field of fields) array(config[name][field], `${name}.${field}`);
  }
  for (const name of ['site', 'home', 'about', 'projects', 'friends', 'cloud']) {
    assert(typeof config[name].title === 'string' && config[name].title.trim(), `${name}.title is required`);
  }
  array(config.site.footer?.groups, 'site.footer.groups');
  config.site.footer.groups.forEach(group => array(group?.links, 'site.footer.groups[].links'));
  array(config.about.profile?.links, 'about.profile.links');
  array(config.about.profile?.facts, 'about.profile.facts');
  for (const [name, fields] of Object.entries({ about: ['cards'], projects: ['featured', 'directions'], friends: ['links', 'apply'], cloud: ['notes'] })) {
    for (const field of fields) config[name][field].forEach((item, index) => {
      const title = Array.isArray(item) ? item[1] : item?.title;
      assert(typeof title === 'string' && title.trim(), `${name}.${field}[${index}].title is required`);
    });
  }
  for (const [name, links] of [['site.nav', config.site.nav], ['about.profile.links', config.about.profile.links], ['home.actions', config.home.actions], ['home.stats', config.home.stats]]) {
    links.forEach((item, index) => assert(typeof (Array.isArray(item) ? item[0] : item?.label) === 'string', `${name}[${index}].label is required`));
  }
  timelineEntries(config.about.timeline);
  const cloud = createFolderIndex(config.cloud);
  for (const folder of cloud.folders.values()) {
    for (const item of folder.entries.filter(item => item.type === 'file')) resourceUrl(item.downloadUrl || item.href || item.downloadPath || item.path, config.cloud.baseUrl);
  }
  for (const action of config.cloud.actions) resourceUrl(action.href || action.path, config.cloud.baseUrl);
  assert(typeof config.images.slots === 'object' && config.images.slots, 'images.slots must be an object');
  assert(Number.isFinite(config.music.volume) && config.music.volume >= 0 && config.music.volume <= 1, 'music.volume must be in [0,1]');

  const origin = `https://${(await readFile(path.join(root, 'CNAME'), 'utf8')).trim()}`;
  async function localReference(value, source, base = origin + '/') {
    assert(safeUrl(value, '', base), `${source}: invalid URL ${value}`);
    const url = new URL(value, base);
    if (url.origin !== origin) return;
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = path.resolve(root, '.' + pathname);
    assert(target.startsWith(path.resolve(root) + path.sep), `${source}: path escapes the public root`);
    assert((await stat(target).catch(() => null))?.isFile(), `${source}: missing local target ${pathname}`);
  }
  async function configLinks(value, source) {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (['href', 'avatar', 'rss'].includes(key) && item) await localReference(item, `${source}.${key}`);
      if (key === 'tags') assert(Array.isArray(item) && item.every(tag => typeof tag === 'string'), `${source}.tags must contain strings`);
      if (item && typeof item === 'object') await configLinks(item, `${source}.${key}`);
    }
  }
  for (const name of ['site', 'home', 'about', 'projects', 'friends']) await configLinks(config[name], name);
  for (const [name, slot] of Object.entries(config.images.slots)) {
    if (slot.images) array(slot.images, `images.${name}.images`);
    for (const item of slot.images || [slot]) {
      assert(item && typeof item === 'object', `images.${name} contains an invalid image`);
      if (item.src) await localReference(imageUrl(item.src, config.images.basePath, origin), `images.${name}`);
    }
  }
  const { posts, outputs } = await buildSiteData(root);
  for (const post of posts) {
    if (post.cover) await localReference(imageUrl(post.cover, config.images.basePath, origin), post.fileName);
  }
  for (const [file, content] of outputs) {
    const current = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
    assert(current === content, `${file} is stale; run npm run generate`);
  }

  const sources = [...publicFiles.map(file => path.join(root, file))];
  for (const directory of publicDirectories) sources.push(...await walkFiles(path.join(root, directory), { skip: ['vendor'] }));
  const versions = config['asset-versions'].versions;
  assert(versions && typeof versions === 'object', 'asset-versions.versions is required');
  for (const asset of Object.keys(versions)) await localReference(asset, 'asset-versions');
  for (const file of sources) {
    const extension = path.extname(file);
    if (!['.html', '.js', '.css'].includes(extension)) continue;
    const content = await readFile(file, 'utf8');
    const relative = path.relative(root, file).replace(/\\/g, '/');
    const base = `${origin}/${relative}`;
    let references = [];
    if (extension === '.html') references = [...content.matchAll(/<(?:link|script|img|a)\b[^>]*\b(?:href|src)=["']([^"']+)["']/g)].map(match => match[1]);
    if (extension === '.js') references = [...content.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)["']([./][^"']+\.js(?:\?[^"']*)?)["']/g)].map(match => match[1]);
    if (extension === '.css') references = [...content.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g)].map(match => match[1] || match[2] || match[3]).filter(value => !value.startsWith('data:'));
    for (const ref of references) {
      if (ref.startsWith('#')) continue;
      await localReference(ref.replace(/&amp;/g, '&'), relative, base);
      const url = new URL(ref, base);
      if (url.origin === origin && /^\/assets\/.*\.(js|css)$/.test(url.pathname) && !url.pathname.includes('/vendor/')) {
        assert(versions[url.pathname], `${relative}: missing cache version entry for ${url.pathname}`);
        assert(url.searchParams.get('v') === versions[url.pathname], `${relative}: stale cache version for ${url.pathname}`);
      }
    }
  }
  return { posts: posts.length, timeline: config.about.timeline.length, sources: sources.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('Validated site:', await validateSite());
}
