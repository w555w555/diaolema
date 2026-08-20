import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COVER_RATIOS, applyFollows, applyLikes, coverRatio, hydrateShareSocial, likeCount, seedLikeCount, toggleId } from './shareSocial';

const mem = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => mem.get(key) ?? null,
  setItem: (key: string, value: string) => {
    mem.set(key, value);
  },
  removeItem: (key: string) => {
    mem.delete(key);
  },
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
} as Storage;

beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage });
  hydrateShareSocial();
});
afterEach(() => mem.clear());

describe('shareSocial', () => {
  it('点赞在种子数上 +1，取消回到种子数', () => {
    const id = 'xhs-dishui';
    const seed = seedLikeCount(id);
    expect(seed).toBeGreaterThan(0);
    expect(likeCount(id, [])).toBe(seed);
    expect(likeCount(id, [id])).toBe(seed + 1);
    expect(likeCount(id, toggleId(id, [id]))).toBe(seed);
  });

  it('同一作者关注/取关可切换', () => {
    expect(toggleId('路亚阿周', [])).toEqual(['路亚阿周']);
    expect(toggleId('路亚阿周', ['路亚阿周'])).toEqual([]);
  });

  it('瀑布流封面比例按 id 变化且不是全 1:1', () => {
    const ids = ['news-century', 'xhs-dishui', 'xhs-jinhai', 'dy-dianshan', 'dy-dalian'];
    const ratios = ids.map(coverRatio);
    expect(new Set(ratios).size).toBeGreaterThan(1);
    expect(ratios.every((ratio) => (COVER_RATIOS as readonly string[]).includes(ratio))).toBe(true);
    expect(COVER_RATIOS.every((ratio) => !ratio.startsWith('3/'))).toBe(true);
  });

  it('云端点赞关注与本机并集', () => {
    applyLikes(['a']);
    expect(applyLikes(['b']).likes).toEqual(['a', 'b']);
    applyFollows(['路亚阿周']);
    expect(applyFollows(['南汇小路']).follows).toEqual(['路亚阿周', '南汇小路']);
  });
});
