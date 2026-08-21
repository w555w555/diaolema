import { describe, expect, it } from 'vitest';
import { applyWaterIndex, normalizeWater, pondCareDelta, venueToWaterKind, waterColorDelta } from './water';
import { buildFishingIndex } from './fishingIndex';
import { buildAdvice } from './advice';
import { climateFlags, planFlavor, planForm, planLure, planSpot, planWindow } from './plan';
import type { WeatherSnapshot } from '../types';

function snap(partial: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    at: '2026-08-17T12:00:00+08:00',
    lat: 31.23,
    lon: 121.47,
    temperatureC: 22,
    apparentC: 22,
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

const dawn = new Date('2026-08-17T06:00:00+08:00');
const noon = new Date('2026-08-17T12:00:00+08:00');

describe('venueToWaterKind', () => {
  it('路亚营地归路亚塘，垂钓园归收费塘，海钓归河口', () => {
    expect(venueToWaterKind({ kind: '路亚营地', name: '漫道水上路亚营地' })).toBe('路亚塘');
    expect(venueToWaterKind({ kind: '垂钓园', name: '上海庆丰路德轩休闲垂钓园' })).toBe('收费塘');
    expect(venueToWaterKind({ kind: '钓鱼营地', name: '奉贤护海垂钓中心' })).toBe('收费塘');
    expect(venueToWaterKind({ kind: '海钓', name: '南汇嘴海钓' })).toBe('河口');
  });

  it('淀山湖滴水湖按大水面，公园按浅湖', () => {
    expect(venueToWaterKind({ kind: '湖泊', name: '淀山湖' })).toBe('大水面');
    expect(venueToWaterKind({ kind: '公园湖', name: '世纪公园' })).toBe('公园浅湖');
  });
});

describe('水色独立算法', () => {
  it('黄绿加分，泥浆减分，恶水压到不宜', () => {
    expect(waterColorDelta('黄绿').delta).toBe(6);
    expect(waterColorDelta('泥浆').delta).toBe(-10);
    expect(waterColorDelta('恶水').delta).toBe(-28);
    expect(waterColorDelta('恶水').cap).toBe(34);
    expect(waterColorDelta('瘦清').delta).toBe(0);
  });

  it('肥浊无风盛夏再减', () => {
    expect(waterColorDelta('肥浊', { summer: true, windKmh: 3 }).delta).toBe(-10);
    expect(waterColorDelta('肥浊', { summer: true, windKmh: 7 }).delta).toBe(-6);
    expect(waterColorDelta('肥浊', { summer: true, windKmh: 12 }).delta).toBe(-6);
  });

  it('指数：黄绿 +6，泥浆 -10', () => {
    const base = buildFishingIndex(snap({ temperatureC: 22 }), dawn);
    const green = buildFishingIndex(snap({ temperatureC: 22 }), dawn, { waterColor: '黄绿' });
    const mud = buildFishingIndex(snap({ temperatureC: 22 }), dawn, { waterColor: '泥浆' });
    expect(green.score).toBe(base.score + 6);
    expect(mud.score).toBe(base.score - 10);
    expect(green.reasons.some((r) => r.includes('黄绿'))).toBe(true);
  });

  it('恶水档位不宜', () => {
    const idx = buildFishingIndex(snap({ temperatureC: 22, pressureHpa: 1024, pressureDelta3h: 0.1 }), dawn, {
      waterColor: '恶水',
    });
    expect(idx.label).toBe('不宜');
    expect(idx.score).toBeLessThanOrEqual(34);
  });
});

describe('收费塘保养', () => {
  it('刚换水只在收费塘/路亚塘减分', () => {
    expect(pondCareDelta('收费塘', '刚换水').delta).toBe(-12);
    expect(pondCareDelta('路亚塘', '刚调水消毒').delta).toBe(-10);
    expect(pondCareDelta('公园浅湖', '刚换水').delta).toBe(0);
    expect(normalizeWater({ waterKind: '公园浅湖', pondCare: '刚换水' }).pondCare).toBe('未知');
  });

  it('指数：收费塘刚换水 -12，浅湖忽略保养', () => {
    const base = buildFishingIndex(snap({ temperatureC: 22 }), dawn);
    const pond = buildFishingIndex(snap({ temperatureC: 22 }), dawn, {
      waterKind: '收费塘',
      pondCare: '刚换水',
    });
    const park = buildFishingIndex(snap({ temperatureC: 22 }), dawn, {
      waterKind: '公园浅湖',
      pondCare: '刚换水',
    });
    expect(pond.score).toBe(base.score - 12);
    expect(park.score).toBe(base.score);
  });

  it('刚换水软粘轻口，不抽散炮', () => {
    const a = buildAdvice(snap({ temperatureC: 22 }), dawn, {
      targetFish: '鲫鱼',
      style: '台钓',
      waterKind: '收费塘',
      pondCare: '刚换水',
    });
    expect(a.form).toBe('软粘轻口');
    expect(a.baitLabel).toMatch(/软粘/);
    expect(a.window).toBe('刚换水口差');
    expect(a.tip).toMatch(/散炮/);
    expect(a.spot).toMatch(/进水口/);
  });

  it('老水略离底避酱层', () => {
    const a = buildAdvice(snap({ pressureHpa: 1024, pressureDelta3h: 0.1, temperatureC: 22 }), dawn, {
      targetFish: '鲤鱼',
      style: '台钓',
      waterKind: '收费塘',
      pondCare: '老水',
    });
    expect(a.layer).toBe('中下层');
    expect(a.spot).toMatch(/酱层/);
  });
});

describe('水域类型改拟饵与标点', () => {
  it('公园浅湖翘嘴 5–7g，大水面 7–12g', () => {
    const flags = climateFlags(snap({ temperatureC: 26 }), noon);
    expect(planLure('翘嘴', flags, { waterKind: '公园浅湖' })).toMatch(/5–7g/);
    expect(planLure('翘嘴', flags, { waterKind: '大水面' })).toMatch(/7–12g/);
  });

  it('肥浊路亚改红头金并贴结构', () => {
    const flags = climateFlags(snap({ temperatureC: 24 }), dawn);
    expect(planLure('鲈鱼', flags, { waterKind: '路亚塘', waterColor: '泥浆' })).toMatch(/红头金|高对比/);
    expect(planSpot('鲈鱼', flags, '路亚', { waterKind: '路亚塘', pondCare: '老水' })).toMatch(/酱层/);
  });

  it('瘦清偏腥香，收费塘正午改增氧机荫凉', () => {
    const noonFlags = climateFlags(snap({ temperatureC: 33 }), noon);
    expect(planFlavor(noonFlags, { waterColor: '瘦清' })).toBe('腥香');
    expect(planWindow(noonFlags, { waterColor: '恶水' })).toBe('水色不宜');
    expect(planSpot('鲫鱼', noonFlags, '台钓', { waterKind: '收费塘' })).toMatch(/增氧机/);
    expect(planForm('鲫鱼', climateFlags(snap({ temperatureC: 22 }), dawn), '台钓', { waterKind: '收费塘', pondCare: '刚换水' })).toBe(
      '软粘轻口',
    );
  });
});

describe('applyWaterIndex 组合', () => {
  it('黄绿与刚换水同时生效', () => {
    const next = applyWaterIndex(62, [], { waterKind: '收费塘', waterColor: '黄绿', pondCare: '刚换水' });
    expect(next.score).toBe(56);
  });
});
