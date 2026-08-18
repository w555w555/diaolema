import { describe, expect, it } from 'vitest';
import { COVER_RATIOS, coverRatio, likeCount, seedLikeCount, toggleId } from './shareSocial';

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
    expect(ratios.some((ratio) => ratio !== '1/1')).toBe(true);
  });
});
