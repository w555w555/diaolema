import { describe, expect, it } from 'vitest';
import { fishGuide, clampLayerToHabit } from './fishGuide';

describe('fishGuide', () => {
  it('翘嘴给出习性与路亚技巧', () => {
    const guide = fishGuide('翘嘴');
    expect(guide.name).toBe('翘嘴');
    expect(guide.intro).toContain('掠食');
    expect(guide.habitat).toContain('深浅交界');
    expect(guide.habitLayer).toBe('中上层');
    expect(guide.layerFloor).toBe('中下层');
    expect(guide.sources.some((row) => row.includes('百科'))).toBe(true);
    expect(guide.tips.some((row) => row.style === '路亚' && row.items.some((item) => item.includes('亮片')))).toBe(
      true,
    );
  });

  it('词表内鱼种都有外形与上海水域', () => {
    const guide = fishGuide('鲫鱼');
    expect(guide.habitLayer).toBe('底层');
    expect(guide.layerFloor).toBeNull();
    expect(guide.methods).toEqual(['台钓']);
    expect(guide.look).toContain('侧扁');
    expect(guide.shanghai).toContain('上海');
    expect(guide.baitHint).toContain('拉饵');
  });

  it('词表外回落通用说明', () => {
    const guide = fishGuide('未知鱼');
    expect(guide.name).toBe('未知鱼');
    expect(guide.intro).toContain('词表');
    expect(guide.tips.length).toBeGreaterThan(0);
  });

  it('翘嘴水层不能被压到守底', () => {
    expect(clampLayerToHabit('翘嘴', '底层')).toBe('中下层');
    expect(clampLayerToHabit('白条', '底层')).toBe('中上层');
    expect(clampLayerToHabit('鲫鱼', '底层')).toBe('底层');
    expect(clampLayerToHabit('翘嘴', '上层')).toBe('上层');
  });
});
