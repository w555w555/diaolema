import { describe, expect, it } from 'vitest';
import { averageScore, rankVenues, reviewCountLabel, reviewsForVenue, scoreForVenue, starFill } from './spotScore';
import type { SpotReview } from '../types';

const sample = (over: Partial<SpotReview>): SpotReview => ({
  id: 'r1',
  venueId: 'dy-pe',
  author: '路亚阿周',
  rating: 4,
  body: '口还可以',
  createdAt: '2026-08-18T00:00:00.000Z',
  source: 'seed',
  ...over,
});

describe('averageScore', () => {
  it('无反馈时没有渔见分', () => {
    expect(averageScore([])).toBeNull();
  });

  it('等于星级算术平均并保留一位小数', () => {
    expect(averageScore([5, 4, 4])).toBe(4.3);
    expect(averageScore([5, 5, 5])).toBe(5);
  });
});

describe('starFill', () => {
  it('无反馈时五颗空星', () => {
    expect(starFill(null)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
  });

  it('最多五星，均分就近半星，不输出数字文案', () => {
    expect(starFill(5)).toEqual(['full', 'full', 'full', 'full', 'full']);
    expect(starFill(4.3)).toEqual(['full', 'full', 'full', 'full', 'half']);
    expect(starFill(4)).toEqual(['full', 'full', 'full', 'full', 'empty']);
  });
});

describe('reviewsForVenue', () => {
  it('只留下当前钓点的反馈并按时间新到旧', () => {
    const rows = [
      sample({ id: 'old', venueId: 'dy-pe', createdAt: '2026-08-01T00:00:00.000Z' }),
      sample({ id: 'other', venueId: 'dy-hefeng', createdAt: '2026-08-18T00:00:00.000Z' }),
      sample({ id: 'new', venueId: 'dy-pe', createdAt: '2026-08-17T00:00:00.000Z' }),
    ];
    expect(reviewsForVenue('dy-pe', rows).map((row) => row.id)).toEqual(['new', 'old']);
  });
});

describe('scoreForVenue', () => {
  it('只均分当前钓点的星级', () => {
    const rows = [
      sample({ id: 'a', venueId: 'dy-pe', rating: 5 }),
      sample({ id: 'b', venueId: 'dy-pe', rating: 4 }),
      sample({ id: 'c', venueId: 'dy-hefeng', rating: 1 }),
    ];
    expect(scoreForVenue('dy-pe', rows)).toBe(4.5);
    expect(scoreForVenue('missing', rows)).toBeNull();
  });
});

describe('reviewCountLabel', () => {
  it('排出反馈条数文案', () => {
    expect(reviewCountLabel(0)).toBe('暂无反馈');
    expect(reviewCountLabel(3)).toBe('3 条反馈');
  });
});

describe('rankVenues', () => {
  it('按渔见均分从高到低，无分排最后', () => {
    const venues = [{ id: 'none' }, { id: 'mid' }, { id: 'top' }];
    const rows = [
      sample({ id: 't1', venueId: 'top', rating: 5 }),
      sample({ id: 't2', venueId: 'top', rating: 5 }),
      sample({ id: 'm1', venueId: 'mid', rating: 3 }),
    ];
    expect(rankVenues(venues, rows).map((row) => row.id)).toEqual(['top', 'mid', 'none']);
  });
});
