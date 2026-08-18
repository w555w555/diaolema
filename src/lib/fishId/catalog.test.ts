import { describe, expect, it } from 'vitest';
import { FISH_CATALOG, UNCERTAIN, catalogForStyle, coerceFishForStyle, fishFitsStyle, normalizeFishName, parseFishReply } from './catalog';

describe('normalizeFishName', () => {
  it('词表内标准名原样返回', () => {
    expect(normalizeFishName('鲫鱼')).toBe('鲫鱼');
    expect(normalizeFishName('鲤鱼')).toBe('鲤鱼');
    expect(normalizeFishName('鲈鱼')).toBe('鲈鱼');
    expect(FISH_CATALOG.length).toBeGreaterThanOrEqual(19);
  });

  it('别名映射到词表', () => {
    expect(normalizeFishName('乌鳢')).toBe('黑鱼');
    expect(normalizeFishName('黄辣丁')).toBe('黄颡鱼');
    expect(normalizeFishName('花鲈')).toBe('鲈鱼');
    expect(normalizeFishName('桂鱼')).toBe('鳜鱼');
    expect(normalizeFishName('鳊')).toBe('鳊鱼');
  });

  it('词表外英文种名视为不确定', () => {
    expect(normalizeFishName('largemouth bass')).toBe(UNCERTAIN);
    expect(normalizeFishName('大口黑鲈')).toBe(UNCERTAIN);
  });

  it('空值和乱码为不确定', () => {
    expect(normalizeFishName('')).toBe(UNCERTAIN);
    expect(normalizeFishName('鞋子')).toBe(UNCERTAIN);
    expect(normalizeFishName(undefined)).toBe(UNCERTAIN);
  });
});

describe('catalogForStyle', () => {
  it('台钓不含鲈翘黑鳜，路亚不含鲫鲤草青', () => {
    const floatFish = catalogForStyle('台钓');
    const lureFish = catalogForStyle('路亚');
    expect(floatFish).toContain('鲫鱼');
    expect(floatFish).toContain('黄颡鱼');
    expect(floatFish).not.toContain('鲈鱼');
    expect(floatFish).not.toContain('翘嘴');
    expect(floatFish).not.toContain('黑鱼');
    expect(floatFish).not.toContain('鳜鱼');
    expect(lureFish).toContain('鲈鱼');
    expect(lureFish).toContain('翘嘴');
    expect(lureFish).toContain('黑鱼');
    expect(lureFish).toContain('鳜鱼');
    expect(lureFish).not.toContain('鲫鱼');
    expect(lureFish).not.toContain('鲤鱼');
    expect(lureFish).not.toContain('草鱼');
    expect(lureFish).not.toContain('青鱼');
  });

  it('白条罗非鲶塘鲺两边都能选', () => {
    for (const name of ['白条', '罗非鱼', '鲶鱼', '塘鲺'] as const) {
      expect(fishFitsStyle(name, '台钓')).toBe(true);
      expect(fishFitsStyle(name, '路亚')).toBe(true);
    }
  });

  it('切换钓法时鲫鱼改成翘嘴，白条保留', () => {
    expect(coerceFishForStyle('鲫鱼', '路亚')).toBe('翘嘴');
    expect(coerceFishForStyle('鲈鱼', '台钓')).toBe('鲫鱼');
    expect(coerceFishForStyle('白条', '路亚')).toBe('白条');
    expect(coerceFishForStyle('白条', '台钓')).toBe('白条');
  });

  it('词表每条鱼至少归属一种钓法', () => {
    for (const name of FISH_CATALOG) {
      expect(fishFitsStyle(name, '台钓') || fishFitsStyle(name, '路亚')).toBe(true);
    }
  });
});

describe('parseFishReply', () => {
  it('从网站散文里抽出词表鱼名', () => {
    const result = parseFishReply('根据体型和侧线，这更像鲈鱼，也有可能是翘嘴。');
    expect(result.species).toBe('鲈鱼');
    expect(result.alternatives.some((a) => a.species === '翘嘴')).toBe(true);
  });

  it('读得懂 JSON', () => {
    const result = parseFishReply('{"species":"鲫鱼","confidence":0.9,"cues":["体侧扁"]}');
    expect(result.species).toBe('鲫鱼');
    expect(result.confidence).toBe(0.9);
  });

  it('主名不确定时采用第一词表候选', () => {
    const result = parseFishReply(
      '{"species":"不确定","confidence":0.2,"alternatives":[{"species":"黑鱼","confidence":0.4}],"cues":["头扁有云斑"]}',
    );
    expect(result.species).toBe('黑鱼');
    expect(result.inCatalog).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });
});
