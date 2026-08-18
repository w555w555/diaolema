import { describe, expect, it } from 'vitest';
import { fishGuide } from './fishGuide';

describe('fishGuide', () => {
  it('翘嘴给出习性与路亚技巧', () => {
    const guide = fishGuide('翘嘴');
    expect(guide.name).toBe('翘嘴');
    expect(guide.intro).toContain('掠食');
    expect(guide.habitat).toContain('深浅交界');
    expect(guide.tips.some((row) => row.style === '路亚' && row.items.some((item) => item.includes('亮片')))).toBe(
      true,
    );
  });

  it('鲫鱼给出台钓技巧，不含路亚专条', () => {
    const guide = fishGuide('鲫鱼');
    expect(guide.tips.map((row) => row.style)).toEqual(['台钓']);
    expect(guide.intro).toContain('底层');
  });

  it('词表外回落通用说明', () => {
    const guide = fishGuide('未知鱼');
    expect(guide.name).toBe('未知鱼');
    expect(guide.intro).toContain('词表');
    expect(guide.tips.length).toBeGreaterThan(0);
  });
});
