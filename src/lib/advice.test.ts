import { describe, expect, it } from 'vitest';
import { buildAdvice } from './advice';
import type { WeatherSnapshot } from '../types';

function snap(partial: Partial<WeatherSnapshot>): WeatherSnapshot {
  return {
    at: '2026-08-17T12:00:00+08:00',
    lat: 31.23,
    lon: 121.47,
    temperatureC: 26,
    apparentC: 27,
    humidityPct: 70,
    pressureHpa: 1015,
    pressureDelta3h: 0.2,
    windKmh: 10,
    windDirDeg: 90,
    precipitationMm: 0,
    weatherCode: 1,
    cloudPct: 40,
    ...partial,
  };
}

const noon = new Date('2026-08-17T12:00:00+08:00');
const dawn = new Date('2026-08-17T06:00:00+08:00');

describe('buildAdvice', () => {
  it('盛夏正午高温 → 底层守底', () => {
    const a = buildAdvice(snap({ temperatureC: 33 }), noon);
    expect(a.layer).toBe('底层');
    expect(a.method).toMatch(/夜钓/);
    expect(a.reasons.some((r) => r.includes('避热'))).toBe(true);
  });

  it('气压急降 → 中上层', () => {
    const a = buildAdvice(snap({ pressureDelta3h: -2.4, temperatureC: 27 }), dawn);
    expect(a.layer).toBe('中上层');
    expect(a.baits).toContain('腥香商品饵');
  });

  it('高气压稳定 → 底层', () => {
    const a = buildAdvice(snap({ pressureHpa: 1024, pressureDelta3h: 0.1 }), dawn);
    expect(a.layer).toBe('底层');
    expect(a.method).toMatch(/守底/);
  });

  it('低气压 → 中上层', () => {
    const a = buildAdvice(snap({ pressureHpa: 1005, pressureDelta3h: 0 }), dawn);
    expect(a.layer).toBe('中上层');
  });

  it('默认中下层，降水上调一层', () => {
    const dry = buildAdvice(snap({ pressureHpa: 1015 }), dawn);
    expect(dry.layer).toBe('中下层');
    const wet = buildAdvice(snap({ pressureHpa: 1015, precipitationMm: 1.2, weatherCode: 61 }), dawn);
    expect(wet.layer).toBe('中上层');
  });

  it('路亚按对象鱼给出克数颜色与操法', () => {
    const a = buildAdvice(snap({ temperatureC: 26 }), noon, { targetFish: '翘嘴', style: '路亚' });
    expect(a.lure).toMatch(/7–12g/);
    expect(a.lure).toMatch(/斜切亮片/);
    expect(a.lureNote).toMatch(/匀速/);
    const snake = buildAdvice(snap({ temperatureC: 24 }), dawn, { targetFish: '黑鱼', style: '路亚' });
    expect(snake.lure).toMatch(/雷蛙/);
    expect(snake.lureNote).toMatch(/停顿/);
  });

  it('路亚默认对象不含鲫鲤，台钓默认不含鲈翘', () => {
    const lure = buildAdvice(snap({ temperatureC: 26 }), noon, { style: '路亚' });
    expect(lure.targetFish.some((n) => ['鲈鱼', '翘嘴', '白条', '黑鱼'].includes(n))).toBe(true);
    expect(lure.targetFish).not.toContain('鲫鱼');
    const float = buildAdvice(snap({ temperatureC: 26 }), noon, { style: '台钓' });
    expect(float.targetFish).toContain('鲫鱼');
    expect(float.targetFish).not.toContain('鲈鱼');
    expect(float.targetFish).not.toContain('翘嘴');
  });
});
