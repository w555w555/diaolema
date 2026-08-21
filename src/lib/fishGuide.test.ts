import { describe, expect, it } from 'vitest';
import { fishGuide } from './fishGuide';

describe('fishGuide', () => {
  it('翘嘴给出习性与路亚技巧', () => {
    const guide = fishGuide('翘嘴');
    expect(guide.name).toBe('翘嘴');
    expect(guide.intro).toContain('掠食');
    expect(guide.habitat).toContain('深浅交界');
    expect(guide.tips.some((row) => row.style === '路亚' && row.items.some((item) => item.includes('5–7g')))).toBe(
      true,
    );
  });

  it('鲫鱼给出台钓技巧，不含路亚专条', () => {
    const guide = fishGuide('鲫鱼');
    expect(guide.tips.map((row) => row.style)).toEqual(['台钓']);
    expect(guide.intro).toContain('底层');
  });

  it('鲈鱼介绍区分塘鲈加州鲈与河口花鲈', () => {
    const guide = fishGuide('鲈鱼');
    expect(guide.intro).toMatch(/加州鲈|大口黑鲈/);
    expect(guide.intro).toMatch(/花鲈/);
    expect(guide.aliases).toMatch(/加州鲈/);
  });

  it('鲻鱼强调台钓与落潮，不指路亚', () => {
    const guide = fishGuide('鲻鱼');
    expect(guide.intro).toMatch(/路亚效果差/);
    expect(guide.tips.some((row) => row.items.some((item) => item.includes('落潮')))).toBe(true);
  });

  it('词表外回落通用说明', () => {
    const guide = fishGuide('未知鱼');
    expect(guide.name).toBe('未知鱼');
    expect(guide.intro).toContain('词表');
    expect(guide.tips.length).toBeGreaterThan(0);
  });
});
