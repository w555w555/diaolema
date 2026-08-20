import type { CatchReport } from '../types';
import { DEMO_FANS, type MeFan } from './meProfile';

export function reportsByAuthor(reports: CatchReport[], author: string): CatchReport[] {
  return reports
    .filter((row) => row.author === author)
    .sort((a, b) => new Date(b.caughtAt).getTime() - new Date(a.caughtAt).getTime());
}

export function authorCard(name: string): Pick<MeFan, 'name' | 'city' | 'note'> & { sample: boolean } {
  const hit = DEMO_FANS.find((row) => row.name === name);
  if (hit) return { name: hit.name, city: hit.city, note: hit.note, sample: true };
  return { name, city: '上海', note: '钓友', sample: false };
}

export function mergeFanList(extraNames: Iterable<string>): MeFan[] {
  const demo = DEMO_FANS;
  const seen = new Set(demo.map((row) => row.name));
  const extra: MeFan[] = [];
  for (const raw of extraNames) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    extra.push({ id: `fan-${name}`, name, city: '上海', note: '关注了你' });
  }
  return [...demo, ...extra];
}
