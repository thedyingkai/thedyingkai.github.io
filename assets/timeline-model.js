import { postDate } from './lib/posts.js?v=1.0';

export const TIMELINE_LEVEL_RANK = Object.freeze({ dot: 0, minor: 1, mid: 2, major: 3 });

export function timelineEntries(items) {
  if (!Array.isArray(items)) throw new Error('about.timeline must be an array.');
  return items.map((item, index) => {
    const data = Array.isArray(item) ? { date: item[0], title: item[1], level: item[2] } : item;
    if (!data || !Object.hasOwn(TIMELINE_LEVEL_RANK, data.level)) {
      throw new Error(`about.timeline[${index}]: level is required: dot, minor, mid or major.`);
    }
    if (typeof data.title !== 'string' || !data.title.trim() || !postDate(data.date)) {
      throw new Error(`about.timeline[${index}]: title and a valid date are required.`);
    }
    return { data, level: data.level };
  }).sort((a, b) => postDate(a.data.date) - postDate(b.data.date));
}
