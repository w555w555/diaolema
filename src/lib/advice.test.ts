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
    expect(a.reasons.some((r) => r.includes('避晒'))).toBe(true);
  });

  it('气压急降 → 中上层，文案是经验不是开口因果', () => {
    const a = buildAdvice(snap({ pressureDelta3h: -2.4, temperatureC: 27 }), dawn);
    expect(a.layer).toBe('中上层');
    expect(a.baits).toContain('腥香商品饵');
    expect(a.tip).toMatch(/经验/);
    expect(a.tip).not.toMatch(/氧薄|开口|上浮抢食/);
    expect(a.reasons.some((r) => r.includes('经验'))).toBe(true);
  });

  it('高气压稳定 → 底层', () => {
    const a = buildAdvice(snap({ pressureHpa: 1024, pressureDelta3h: 0.1 }), dawn, { targetFish: '鲫鱼', style: '台钓' });
    expect(a.layer).toBe('底层');
    expect(a.method).toMatch(/守底/);
  });

  it('低气压 → 中上层，不写氧薄', () => {
    const a = buildAdvice(snap({ pressureHpa: 1005, pressureDelta3h: 0 }), dawn);
    expect(a.layer).toBe('中上层');
    expect(a.tip).toMatch(/经验/);
    expect(a.tip).not.toMatch(/低压氧薄/);
    expect(a.reasons.join('')).not.toMatch(/低压氧薄|溶氧实测/);
  });

  it('理由写水色推演，不是测站', () => {
    const a = buildAdvice(snap({ precipitationMm: 0, weatherCode: 1 }), dawn);
    expect(a.reasons.some((r) => r.includes('未目测') && r.includes('降水推演'))).toBe(true);
  });

  it('目测肥水写入理由并改果酸', () => {
    const a = buildAdvice(snap({ temperatureC: 24 }), dawn, { sightedWater: '肥水', style: '台钓' });
    expect(a.reasons.some((r) => r.includes('目测水色：肥水'))).toBe(true);
    expect(a.flavor).toMatch(/果酸|清淡/);
  });

  it('默认中下层，降水上调一层', () => {
    const dry = buildAdvice(snap({ pressureHpa: 1015 }), dawn, { targetFish: '鲫鱼', style: '台钓' });
    expect(dry.layer).toBe('中下层');
    const wet = buildAdvice(snap({ pressureHpa: 1015, precipitationMm: 1.2, weatherCode: 61 }), dawn, {
      targetFish: '鲫鱼',
      style: '台钓',
    });
    expect(wet.layer).toBe('中上层');
  });

  it('路亚翘嘴盛夏正午不写成守底', () => {
    const a = buildAdvice(snap({ temperatureC: 33 }), noon, { targetFish: '翘嘴', style: '路亚' });
    expect(a.layer).not.toBe('底层');
    expect(a.layer).toBe('中下层');
    expect(a.method).not.toMatch(/守底/);
  });

  it('路亚按对象鱼给出克数颜色与操法', () => {
    const a = buildAdvice(snap({ temperatureC: 26 }), noon, { targetFish: '翘嘴', style: '路亚' });
    expect(a.lure).toMatch(/7–12g/);
    expect(a.lure).toMatch(/斜切亮片/);
    expect(a.lureNote).toMatch(/匀速/);
    expect(a.lureScent).toMatch(/硬饵无味型/);
    expect(a.lureScentClass).toBe('hard');
    expect(a.lureScent).toMatch(/油性/);
    const bass = buildAdvice(snap({ temperatureC: 22 }), noon, { targetFish: '鲈鱼', style: '路亚' });
    expect(bass.lureScentClass).toBe('powerbait-like');
    expect(bass.lureScent).toMatch(/PowerBait|贝克力|加盐虾/);
    expect(bass.lureScent).toMatch(/不是远诱|含饵/);
    expect(bass.lureScent).not.toMatch(/400|45%/);
    const snake = buildAdvice(snap({ temperatureC: 24 }), dawn, { targetFish: '黑鱼', style: '路亚' });
    expect(snake.lure).toMatch(/雷蛙/);
    expect(snake.lureNote).toMatch(/停顿/);
  });

  it('路亚饵色按水色×鱼种出分，标经验', () => {
    const clear = buildAdvice(snap({ temperatureC: 26 }), noon, {
      targetFish: '翘嘴',
      style: '路亚',
      sightedWater: '清澈',
    });
    expect(clear.lureColors?.[0]?.family).toBe('银白');
    expect(clear.lureColorWhy).toMatch(/饵色/);
    expect(clear.lureColorWhy).toMatch(/清澈/);
    expect(clear.reasons[0]).toMatch(/饵色/);
    expect(clear.tip).toMatch(/饵色优先银白/);
    const mud = buildAdvice(snap({ temperatureC: 26 }), noon, {
      targetFish: '翘嘴',
      style: '路亚',
      sightedWater: '浑浊',
    });
    expect(mud.lureColors?.[0]?.family).toBe('红头金');
    const green = buildAdvice(snap({ temperatureC: 24 }), noon, {
      targetFish: '鲈鱼',
      style: '路亚',
      sightedWater: '肥水',
    });
    expect(green.lureColors?.[0]?.family).toBe('草黄');
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
