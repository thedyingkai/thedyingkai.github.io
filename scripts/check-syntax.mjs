import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { projectRoot } from './generate-site-data.mjs';
import { walkFiles } from './site-files.mjs';

let count = 0;
for (const directory of ['assets', 'scripts', 'tests']) {
  for (const file of await walkFiles(path.join(projectRoot, directory), { skip: ['vendor'] })) {
    if (!/\.(?:js|mjs)$/.test(file)) continue;
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    count++;
  }
}
console.log(`Syntax checked ${count} first-party JavaScript files.`);
