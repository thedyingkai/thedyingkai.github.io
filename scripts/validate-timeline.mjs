import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { timelineEntries } from '../assets/timeline-model.js';

export function validateTimeline(items) { timelineEntries(items); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const about = JSON.parse(await readFile(new URL('../config/about.json', import.meta.url), 'utf8'));
  validateTimeline(about.timeline);
  console.log(`Validated explicit levels for ${about.timeline.length} timeline entries.`);
}
