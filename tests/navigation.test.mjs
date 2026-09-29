import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pagePath, isSitePage, samePage, mayNavigateLink } from '../assets/navigation.js';

const base = new URL('https://blog.example.org/blog/');
const url = value => new URL(value, base);

test('site page paths normalize directory aliases without rewriting files', () => {
  for (const [source, expected] of [
    ['/', '/'], ['/index.html', '/'], ['/blog', '/blog/'],
    ['/blog/', '/blog/'], ['/blog/index.html', '/blog/'],
    ['/blog/post/index.html', '/blog/post/'], ['/404.html', '/404.html'],
    ['/assets/example.html', '/assets/example.html']
  ]) assert.equal(pagePath(source), expected, source);
});

test('soft navigation only accepts known same-origin HTTP pages', () => {
  for (const path of ['/', '/index.html', '/blog', '/blog/', '/blog/post/?file=a.md', '/about/#timeline', '/projects/index.html', '/cloud/#folder=archive', '/friends/', '/404.html']) {
    assert.equal(isSitePage(url(path), base), true, path);
  }
  for (const path of [
    'https://other.example.org/about/', 'http://blog.example.org/about/',
    'https://name:secret@blog.example.org/about/', 'https://blog.example.org:8443/about/',
    'mailto:test@example.org', 'javascript:alert(1)', 'data:text/html,test',
    '/rss.xml', '/sitemap.xml', '/posts/a.md', '/assets/music-player.js',
    '/missing/', '/cloud/archive/', '/Blog/', '/about/elsewhere/'
  ]) assert.equal(isSitePage(url(path), base), false, path);
});

test('same-page history ignores fragments but preserves article query and origin', () => {
  assert.equal(samePage(url('/about/'), url('/about/index.html#timeline')), true);
  assert.equal(samePage(url('/blog'), url('/blog/')), true);
  assert.equal(samePage(url('/cloud/#folder=root'), url('/cloud/#folder=archive')), true);
  assert.equal(samePage(url('/blog/post/?file=a.md#one'), url('/blog/post/?file=a.md#two')), true);
  assert.equal(samePage(url('/blog/post/?file=a.md'), url('/blog/post/?file=b.md')), false);
  assert.equal(samePage(url('/about/?one=1'), url('/about/?one=2')), false);
  assert.equal(samePage(url('/about/'), url('/projects/')), false);
  assert.equal(samePage(url('/about/'), new URL('https://other.example.org/about/')), false);
});

test('click guard keeps modified, download, explicit-native and new-window links native', () => {
  const event = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  const anchor = (attributes = {}) => {
    const attrs = { href: '/about/', ...attributes };
    return {
      target: attrs.target || '',
      hasAttribute: name => Object.hasOwn(attrs, name),
      getAttribute: name => attrs[name] ?? null
    };
  };
  assert.equal(mayNavigateLink(event, anchor()), true);
  assert.equal(mayNavigateLink(event, anchor({ target: '_self' })), true);
  assert.equal(mayNavigateLink(event, anchor({ target: '_SELF' })), true);
  assert.equal(mayNavigateLink(event, null), false);
  for (const key of ['defaultPrevented', 'metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    assert.equal(mayNavigateLink({ ...event, [key]: true }, anchor()), false, key);
  }
  for (const button of [1, 2]) assert.equal(mayNavigateLink({ ...event, button }, anchor()), false);
  for (const attrs of [
    { download: '' }, { download: 'page.html' }, { 'data-native-navigation': '' },
    { target: '_blank' }, { target: '_parent' }, { target: 'named-tab' }, { href: '' }, { href: null }
  ]) assert.equal(mayNavigateLink(event, anchor(attrs)), false, JSON.stringify(attrs));
});
