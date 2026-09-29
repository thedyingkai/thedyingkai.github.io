import { httpUrl } from './lib/urls.js?v=1.0';

export function resourceUrl(value, baseUrl) {
  const base = httpUrl(baseUrl, 'about:blank');
  if (!base) throw new Error('云盘 baseUrl 必须是 HTTP(S) 地址');
  const raw = String(value || '/').trim();
  const url = httpUrl(raw === '/' || !raw ? base : raw.replace(/^\/(?!\/)/, ''), base.endsWith('/') ? base : base + '/');
  if (!url) throw new Error('请输入有效的资源路径或 HTTP(S) 地址');
  return url;
}

export function createFolderIndex(config) {
  if (!Array.isArray(config.folders)) throw new Error('cloud.folders 必须是数组');
  const folders = new Map();
  const parents = new Map();
  const root = config.rootFolder || 'root';
  for (const folder of config.folders) {
    if (!folder || typeof folder.id !== 'string' || !folder.id || folders.has(folder.id)) throw new Error('云盘目录 ID 缺失或重复');
    if (!Array.isArray(folder.entries)) throw new Error(`目录 ${folder.id} 缺少 entries 数组`);
    folders.set(folder.id, folder);
  }
  if (!folders.has(root)) throw new Error(`云盘根目录 ${root} 不存在`);
  for (const folder of folders.values()) {
    for (const entry of folder.entries) {
      if (!entry || !['folder', 'file'].includes(entry.type)) throw new Error(`目录 ${folder.id} 包含无效条目`);
      if (entry.type !== 'folder') continue;
      if (!folders.has(entry.folder)) throw new Error(`子目录 ${entry.folder} 不存在`);
      if (parents.has(entry.folder)) throw new Error(`目录 ${entry.folder} 被多个入口重复引用`);
      parents.set(entry.folder, folder.id);
    }
  }
  const complete = new Set();
  // Iterative parent walks avoid recursion limits, and every edge is visited once.
  for (const id of folders.keys()) {
    const walking = new Set();
    let cursor = id;
    while (cursor && !complete.has(cursor)) {
      if (walking.has(cursor)) throw new Error(`云盘目录存在循环引用：${cursor}`);
      walking.add(cursor);
      cursor = parents.get(cursor);
    }
    walking.forEach(value => complete.add(value));
  }
  if (parents.has(root)) throw new Error('根目录不能有上级目录');
  for (const id of folders.keys()) {
    if (id !== root && !parents.has(id)) throw new Error(`目录 ${id} 未连接到根目录`);
  }
  const trail = id => {
    const result = [];
    for (let cursor = folders.has(id) ? id : root; cursor; cursor = parents.get(cursor)) result.push(folders.get(cursor));
    return result.reverse();
  };
  return { root, folders, parents, trail };
}
