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

  it('气压急降 → 中上层找氧、口差', () => {
    const a = buildAdvice(snap({ pressureDelta3h: -2.4, temperatureC: 27 }), dawn);
    expect(a.layer).toBe('中上层');
    expect(a.baits).toContain('轻质拉饵');
    expect(a.reasons.some((r) => r.includes('口易变差') || r.includes('找氧'))).toBe(true);
    expect(a.window).toBe('气压走低口差');
  });

  it('高气压稳定 → 底层守底', () => {
    const a = buildAdvice(snap({ pressureHpa: 1024, pressureDelta3h: 0.1 }), dawn);
    expect(a.layer).toBe('底层');
    expect(a.method).toMatch(/守底/);
    expect(a.reasons.some((r) => r.includes('宜守底'))).toBe(true);
  });

  it('低气压 → 中上层找氧口差', () => {
    const a = buildAdvice(snap({ pressureHpa: 1005, pressureDelta3h: 0 }), dawn);
    expect(a.layer).toBe('中上层');
    expect(a.reasons.some((r) => r.includes('口差'))).toBe(true);
  });

  it('盛夏正午叠加低压 → 中下层荫凉', () => {
    const a = buildAdvice(snap({ temperatureC: 33, pressureHpa: 1004 }), noon);
    expect(a.layer).toBe('中下层');
    expect(a.reasons.some((r) => r.includes('不要死守亮水底') || r.includes('中下层'))).toBe(true);
  });

  it('盛夏正午台钓草鱼改中上层', () => {
    const a = buildAdvice(snap({ temperatureC: 33 }), noon, { targetFish: '草鱼', style: '台钓' });
    expect(a.layer).toBe('中上层');
    expect(a.reasons.some((r) => r.includes('浮钓') || r.includes('中上层'))).toBe(true);
  });

  it('默认中下层，降水上调一层', () => {
    const dry = buildAdvice(snap({ pressureHpa: 1015 }), dawn);
    expect(dry.layer).toBe('中下层');
    const wet = buildAdvice(snap({ pressureHpa: 1015, precipitationMm: 1.2, weatherCode: 61 }), dawn);
    expect(wet.layer).toBe('中上层');
  });

  it('4级风理由写几级，不写 km/h', () => {
    const a = buildAdvice(snap({ windKmh: 25 }), dawn);
    expect(a.reasons.some((r) => r.includes('4级'))).toBe(true);
    expect(a.reasons.join('')).not.toMatch(/km\/h/);
  });

  it('泥浆建议按鱼种改开口文案', () => {
    const bass = buildAdvice(snap({ temperatureC: 24 }), dawn, {
      targetFish: '鲈鱼',
      style: '路亚',
      waterColor: '泥浆',
    });
    expect(bass.window).toBe('泥浆口差');
    expect(bass.reasons.join('')).toMatch(/开口差|反应距离/);
    const carp = buildAdvice(snap({ temperatureC: 22 }), dawn, {
      targetFish: '鲫鱼',
      style: '台钓',
      waterColor: '泥浆',
    });
    expect(carp.window).toBe('泥浆尚可虫饵');
    expect(carp.reasons.join('')).toMatch(/尚可|虫饵/);
    const mandarin = buildAdvice(snap({ temperatureC: 24 }), dawn, {
      targetFish: '鳜鱼',
      style: '路亚',
      waterColor: '泥浆',
    });
    expect(mandarin.window).toBe('泥浆仍可伏击');
    expect(mandarin.reasons.join('')).toMatch(/侧线/);
  });

  it('路亚按对象鱼给出克数颜色与操法', () => {
    const a = buildAdvice(snap({ temperatureC: 26 }), noon, { targetFish: '翘嘴', style: '路亚' });
    expect(a.lure).toMatch(/5–7g/);
    expect(a.lure).toMatch(/斜切亮片/);
    expect(a.lureNote).toMatch(/匀速/);
    const big = buildAdvice(snap({ temperatureC: 26 }), noon, {
      targetFish: '翘嘴',
      style: '路亚',
      waterKind: '大水面',
    });
    expect(big.lure).toMatch(/7–12g/);
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
