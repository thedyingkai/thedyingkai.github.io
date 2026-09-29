import { test } from 'node:test';
import assert from 'node:assert/strict';
import { musicSettings, playlistId, playlistEndpoint, normalizeTracks, restoredIndex, shuffledIndices, parseLyrics, lyricAt, formatTime, fetchWithTimeout } from '../assets/music-model.js';

test('zero volume, legacy settings and invalid values are handled', () => {
  assert.equal(musicSettings({ volume: .45 }, { settings: { volume: 0 } }).volume, 0);
  assert.equal(musicSettings({}, { volume: 0 }).volume, 0);
  assert.equal(musicSettings({}, { settings: { collapsed: true } }).minimized, true);
  assert.equal(musicSettings({ volume: 'invalid' }).volume, .45);
  assert.equal(musicSettings({}, { settings: { loop: 'invalid' } }).loop, 'all');
});
test('the existing provider and playlist are retained', () => {
  assert.equal(playlistId({ playlistUrl: 'https://music.163.com/playlist?id=6713209040' }), '6713209040');
  assert.equal(playlistEndpoint({ playlistId: '6713209040' }), 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=6713209040');
});
test('invalid or empty audio URLs are not mistaken for the page URL', () => {
  const tracks = normalizeTracks([{ url: '' }, { url: 'javascript:alert(1)' }, { title: 'A', url: '/a.mp3' }], 'https://example.com/');
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].url, 'https://example.com/a.mp3');
  assert.throws(() => normalizeTracks({}, 'https://example.com'));
  assert.throws(() => normalizeTracks([], 'https://example.com'));
});
test('position restore matches the song URL, not a stale index', () => {
  const tracks = [{ url: 'B' }, { url: 'A' }];
  assert.equal(restoredIndex(tracks, { currentUrl: 'A', index: 0 }), 1);
  assert.equal(restoredIndex(tracks, { currentUrl: 'C', index: 0 }), -1);
  assert.equal(restoredIndex([{ url: 'https://api.example.com/?type=url&id=123&server=netease&auth=new' }], { currentUrl: 'https://api.example.com/?type=url&id=123&server=netease&auth=old' }), 0);
});
test('random queue contains every other song once', () => {
  assert.deepEqual(shuffledIndices(8, 3).sort(), [0, 1, 2, 4, 5, 6, 7]);
  assert.deepEqual(shuffledIndices(1, 0), []);
});
test('lyrics handle offsets, repeated timestamps and instrumental intro', () => {
  const lines = parseLyrics('[offset:-500]\n[00:05.00][01:05.00]歌词\n[00:08.0]下一句');
  assert.equal(lyricAt(lines, 0), '');
  assert.equal(lyricAt(lines, 4.5), '歌词');
  assert.equal(lyricAt(lines, 8), '下一句');
  assert.equal(lyricAt(lines, 65), '歌词');
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(65.9), '1:05');
});
test('network errors and timeouts remain rejectable for UI retry', async () => {
  await assert.rejects(fetchWithTimeout('/x', { fetcher: async () => ({ ok: false, status: 503 }) }), /503/);
  await assert.rejects(fetchWithTimeout('/x', { timeout: 5, fetcher: (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }) }), /aborted/);
  assert.deepEqual(await fetchWithTimeout('/x', { fetcher: async () => ({ ok: true, json: async () => [] }) }), []);
});
