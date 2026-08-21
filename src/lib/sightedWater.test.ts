import { describe, expect, it } from 'vitest';
import {
  isSightedWater,
  lurePaint,
  migrateSightedWater,
  rainTintToGuess,
  SIGHTED_WATER,
  waterLureHue,
} from './sightedWater';

describe('SIGHTED_WATER', () => {
  it('四种塘边水色都能用肉眼说明区分', () => {
    expect(SIGHTED_WATER.map((row) => row.id)).toEqual(['清澈', '微浑', '浑浊', '肥水']);
    expect(SIGHTED_WATER.every((row) => row.how.length > 4 && row.swatch.startsWith('#'))).toBe(true);
    expect(isSightedWater('肥水')).toBe(true);
    expect(isSightedWater('藻绿')).toBe(false);
  });

  it('旧七档并进浑浊或肥水', () => {
    expect(migrateSightedWater('黄泥')).toBe('浑浊');
    expect(migrateSightedWater('乳白')).toBe('浑浊');
    expect(migrateSightedWater('黑浑')).toBe('浑浊');
    expect(migrateSightedWater('藻绿')).toBe('肥水');
    expect(migrateSightedWater('茶褐')).toBe('肥水');
  });

  it('降水推演不猜肥水，只落到清澈/微浑/浑浊', () => {
    expect(rainTintToGuess('偏清')).toBe('清澈');
    expect(rainTintToGuess('微浑')).toBe('微浑');
    expect(rainTintToGuess('浑浊')).toBe('浑浊');
  });

  it('目测优先于降水：清澈用银白，肥水用草黄，浑浊用红头金', () => {
    expect(waterLureHue('清澈', '浑浊', true)).toBe('clear');
    expect(waterLureHue('肥水', '偏清', false)).toBe('green');
    expect(waterLureHue('浑浊', '偏清', false)).toBe('stained');
    expect(lurePaint(waterLureHue('清澈', '偏清', false), '红头/金色', '银白自然色')).toBe('银白自然色');
    expect(lurePaint(waterLureHue('肥水', '偏清', false), '红头/金色', '银白自然色')).toBe('草黄/图表绿');
  });

  it('未目测时仍按降水浊度', () => {
    expect(waterLureHue(null, '浑浊', false)).toBe('stained');
    expect(waterLureHue(null, '偏清', false)).toBe('clear');
  });
});
