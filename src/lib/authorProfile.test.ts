import { describe, expect, it } from 'vitest';
import { authorCard, mergeFanList, reportsByAuthor } from './authorProfile';
import { DEMO_FANS } from './meProfile';
import type { CatchReport } from '../types';

const rows: CatchReport[] = [
  {
    id: 'a',
    author: '路亚阿周',
    fish: '鲈鱼',
    spotName: '滴水湖',
    lon: 1,
    lat: 1,
    caughtAt: '2026-08-19T00:00:00.000Z',
    source: 'user',
  },
  {
    id: 'b',
    author: '别人',
    fish: '鲫鱼',
    spotName: '公园',
    lon: 1,
    lat: 1,
    caughtAt: '2026-08-18T00:00:00.000Z',
    source: 'seed',
  },
];

describe('reportsByAuthor', () => {
  it('filters by author', () => {
    expect(reportsByAuthor(rows, '路亚阿周').map((row) => row.id)).toEqual(['a']);
  });
});

describe('authorCard', () => {
  it('uses demo bio when known', () => {
    expect(authorCard('路亚阿周')).toMatchObject({ city: '浦东', sample: true });
    expect(authorCard('新钓友')).toMatchObject({ city: '上海', sample: false, note: '钓友' });
  });
});

describe('mergeFanList', () => {
  it('keeps demo fans and appends extras', () => {
    const next = mergeFanList(['路亚阿周', '新粉丝']);
    expect(next).toHaveLength(DEMO_FANS.length + 1);
    expect(next.some((row) => row.name === '新粉丝' && row.note === '关注了你')).toBe(true);
  });
});
