import { describe, expect, it } from 'vitest';
import { formatCatchCaption, formatRelativeTime } from './caption';
import type { CatchReport } from '../types';

const now = new Date('2026-08-17T12:00:00+08:00');

const report: CatchReport = {
  id: '1',
  author: '沪上老张',
  fish: '鲈鱼',
  spotName: '滴水湖',
  lon: 121.93,
  lat: 30.91,
  caughtAt: '2026-08-17T09:00:00+08:00',
  source: 'seed',
};

describe('caption', () => {
  it('标点附文为 某某某 多少时间之前 钓到了什么鱼', () => {
    expect(formatCatchCaption(report, now)).toBe('沪上老张 3小时前 钓到了鲈鱼');
  });

  it('分钟级', () => {
    expect(formatRelativeTime('2026-08-17T11:40:00+08:00', now)).toBe('20分钟前');
  });

  it('昨天', () => {
    expect(formatRelativeTime('2026-08-16T12:00:00+08:00', now)).toBe('昨天');
  });
});
