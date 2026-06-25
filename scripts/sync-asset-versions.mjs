import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'config', 'asset-versions.json');
const checkOnly = process.argv.includes('--check');
const assetRefPattern = /(<(?:link|script)\b[^>]*\b(?:href|src)=["'])(\/(?:assets|highlight)\/[^"']+\.(?:css|js))(?:\?v=[^"']*)?(["'][^>]*>)/g;

function relativePath(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

async function listHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeVersions(raw) {
  const versions = raw?.versions;
  if (!versions || typeof versions !== 'object' || Array.isArray(versions)) {
    throw new Error('config/asset-versions.json must contain a "versions" object.');
  }

  return Object.fromEntries(Object.entries(versions).map(([assetPath, version]) => {
    if (!assetPath.startsWith('/')) {
      throw new Error(`Asset path must start with "/": ${assetPath}`);
    }
    const value = String(version).trim();
    if (!value) {
      throw new Error(`Asset version cannot be empty: ${assetPath}`);
    }
    return [assetPath, value];
  }));
}

function syncHtml(content, versions, seen) {
  return content.replace(assetRefPattern, (match, prefix, assetPath, suffix) => {
    if (!Object.hasOwn(versions, assetPath)) return match;
    seen.add(assetPath);
    return `${prefix}${assetPath}?v=${versions[assetPath]}${suffix}`;
  });
}

const versions = normalizeVersions(JSON.parse(await readFile(configPath, 'utf8')));
const htmlFiles = await listHtmlFiles(root);
const changed = [];
const seen = new Set();

for (const file of htmlFiles) {
  const original = await readFile(file, 'utf8');
  const next = syncHtml(original, versions, seen);
  if (next === original) continue;
  changed.push(relativePath(file));
  if (!checkOnly) await writeFile(file, next, 'utf8');
}

const unused = Object.keys(versions).filter(assetPath => !seen.has(assetPath));
if (unused.length) {
  console.warn(`Unused version entries: ${unused.join(', ')}`);
}

if (checkOnly && changed.length) {
  console.error(`Asset versions are out of sync:\n${changed.map(file => `- ${file}`).join('\n')}`);
  process.exit(1);
}

console.log(checkOnly
  ? `Asset versions are in sync across ${htmlFiles.length} HTML files.`
  : `Synced asset versions in ${changed.length} HTML file(s).`);
