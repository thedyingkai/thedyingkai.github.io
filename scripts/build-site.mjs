import { cp, mkdir, lstat, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateSiteData, projectRoot } from './generate-site-data.mjs';
import { validateSite } from './validate-site.mjs';
import { publicDirectories, publicFiles, walkFiles } from './site-files.mjs';

await generateSiteData();
execFileSync(process.execPath, [path.join(projectRoot, 'scripts/sync-asset-versions.mjs'), '--check'], { stdio: 'inherit' });
console.log('Validated site:', await validateSite());
const root = await realpath(projectRoot);
const output = path.resolve(root, '_site');
if (path.dirname(output) !== root || path.basename(output) !== '_site') throw new Error('Unsafe output path');
for (const name of [...publicDirectories, ...publicFiles]) {
  const source = path.join(root, name);
  const info = await lstat(source);
  if (info.isSymbolicLink()) throw new Error(`Public source must not be a symlink: ${source}`);
  if (info.isDirectory()) await walkFiles(source);
}
const existing = await lstat(output).catch(error => { if (error.code !== 'ENOENT') throw error; });
if (existing?.isSymbolicLink() || (existing && !existing.isDirectory())) throw new Error('_site must be a regular generated directory');
if (existing) {
  // Refuse junctions/symlinks anywhere inside the exact, validated output target.
  await walkFiles(output);
  await rm(output, { recursive: true });
}
await mkdir(output);
for (const name of [...publicDirectories, ...publicFiles]) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true, filter: source => !path.basename(source).startsWith('_') });
}
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`Built public-only site: ${output}`);
