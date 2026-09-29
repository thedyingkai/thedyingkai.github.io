import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const levels = new Set(['dot', 'minor', 'mid', 'major']);

export function validateTimeline(items) {
  if (!Array.isArray(items)) throw new Error('about.timeline must be an array.');
  items.forEach((item, index) => {
    const level = Array.isArray(item) ? item[2] : item?.level;
    if (!levels.has(level)) {
      throw new Error(`about.timeline[${index}]: level is required and must be dot, minor, mid or major.`);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const about = JSON.parse(await readFile(new URL('../config/about.json', import.meta.url), 'utf8'));
  validateTimeline(about.timeline);
  console.log(`Validated explicit levels for ${about.timeline.length} timeline entries.`);
}
