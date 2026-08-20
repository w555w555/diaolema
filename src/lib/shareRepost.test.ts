import { describe, expect, it } from 'vitest';
import { HUB_ROOMS } from './hub';
import {
  isRepostBody,
  parseRepostBody,
  repostChatBody,
  repostRooms,
  resolveRepost,
  shareCaption,
} from './shareRepost';
import type { CatchReport } from '../types';

const report: CatchReport = {
  id: 'r1',
  author: '路亚阿周',
  fish: '鲈鱼',
  spotName: '滴水湖',
  lon: 121,
  lat: 31,
  caughtAt: '2026-08-19T00:00:00.000Z',
  source: 'xiaohongshu',
  title: '夜路亚一条鲈',
};

describe('shareCaption', () => {
  it('builds a copyable line', () => {
    expect(shareCaption(report)).toBe('【渔见】夜路亚一条鲈 · 滴水湖');
  });
});

describe('repostChatBody', () => {
  it('embeds report id within chat body limit', () => {
    expect(repostChatBody(report)).toBe('转发 · 路亚阿周 在滴水湖 钓到鲈鱼 #yj:r1');
    expect(repostChatBody(report).length).toBeLessThanOrEqual(200);
  });
});

describe('parseRepostBody', () => {
  it('reads tagged and legacy forward lines', () => {
    expect(parseRepostBody('转发 · 路亚阿周 在滴水湖 钓到鲈鱼 #yj:r1')).toEqual({
      reportId: 'r1',
      author: '路亚阿周',
      spotName: '滴水湖',
      fish: '鲈鱼',
    });
    expect(parseRepostBody('转发 · 路亚阿周 在滴水湖 钓到鲈鱼')).toEqual({
      reportId: undefined,
      author: '路亚阿周',
      spotName: '滴水湖',
      fish: '鲈鱼',
    });
    expect(isRepostBody('今晚见')).toBe(false);
  });
});

describe('resolveRepost', () => {
  it('prefers id then author/spot/fish', () => {
    expect(resolveRepost('转发 · 路亚阿周 在滴水湖 钓到鲈鱼 #yj:r1', [report])?.id).toBe('r1');
    expect(resolveRepost('转发 · 路亚阿周 在滴水湖 钓到鲈鱼', [report])?.id).toBe('r1');
    expect(resolveRepost('转发 · 路亚阿周 在滴水湖 钓到鲈鱼 #yj:missing', [report])).toBeNull();
  });
});

describe('repostRooms', () => {
  it('lists hub rooms', () => {
    expect(repostRooms().map((row) => row.id)).toEqual(HUB_ROOMS.map((row) => row.id));
  });
});
