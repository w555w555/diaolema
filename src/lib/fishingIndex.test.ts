import { describe, expect, it } from 'vitest';
import { buildFishingIndex, outingLabel } from './fishingIndex';
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

describe('buildFishingIndex', () => {
  it('气压急降且晨间适温 → 不给很高', () => {
    const idx = buildFishingIndex(snap({ pressureDelta3h: -2.4, temperatureC: 24 }), dawn);
    expect(idx.score).toBe(62);
    expect(idx.label).toBe('一般');
    expect(idx.reasons.some((r) => r.includes('气压下降'))).toBe(true);
    expect(idx.reasons.some((r) => r.includes('口易变差'))).toBe(true);
  });

  it('盛夏正午高温 → 偏低', () => {
    const idx = buildFishingIndex(snap({ temperatureC: 33 }), noon);
    expect(idx.score).toBe(44);
    expect(idx.label).toBe('偏低');
    expect(idx.reasons.some((r) => r.includes('避热'))).toBe(true);
  });

  it('低温雷暴 → 不宜', () => {
    const idx = buildFishingIndex(snap({ temperatureC: 4, weatherCode: 95, precipitationMm: 8 }), dawn);
    expect(idx.label).toBe('不宜');
    expect(idx.score).toBeLessThan(35);
  });

  it('高气压稳定给较高或很高', () => {
    const idx = buildFishingIndex(snap({ pressureHpa: 1024, pressureDelta3h: 0.1 }), dawn);
    expect(idx.score).toBe(86);
    expect(idx.label).toBe('很高');
    expect(idx.reasons.some((r) => r.includes('宜守底'))).toBe(true);
  });

  it('气压急升加分', () => {
    const idx = buildFishingIndex(snap({ pressureDelta3h: 2, temperatureC: 22 }), dawn);
    expect(idx.score).toBeGreaterThan(70);
    expect(idx.reasons.some((r) => r.includes('气压上升'))).toBe(true);
  });

  it('低气压压分', () => {
    const idx = buildFishingIndex(snap({ pressureHpa: 1005, pressureDelta3h: 0, temperatureC: 22 }), dawn);
    expect(idx.score).toBe(66);
    expect(idx.label).toBe('较高');
    expect(idx.reasons.some((r) => r.includes('口差'))).toBe(true);
  });

  it('1007 在上海不算低压口差', () => {
    const idx = buildFishingIndex(snap({ pressureHpa: 1007, pressureDelta3h: 0, temperatureC: 22 }), dawn);
    expect(idx.score).toBe(78);
    expect(idx.reasons.some((r) => r.includes('口差'))).toBe(false);
  });

  it('极端天气夹紧到 0–100', () => {
    const low = buildFishingIndex(
      snap({ temperatureC: 36, precipitationMm: 12, weatherCode: 95, windKmh: 40 }),
      noon,
    );
    expect(low.score).toBe(0);
    const high = buildFishingIndex(
      snap({ pressureDelta3h: -2.2, temperatureC: 22, precipitationMm: 0.4, weatherCode: 51 }),
      dawn,
    );
    expect(high.score).toBeLessThanOrEqual(100);
    expect(high.score).toBeGreaterThanOrEqual(0);
  });

  it('4级风不减指数，5级才减', () => {
    const four = buildFishingIndex(
      snap({ temperatureC: 22, windKmh: 25, pressureHpa: 1007, pressureDelta3h: 0 }),
      dawn,
    );
    const five = buildFishingIndex(
      snap({ temperatureC: 22, windKmh: 30, pressureHpa: 1007, pressureDelta3h: 0 }),
      dawn,
    );
    expect(four.score).toBe(78);
    expect(four.reasons.some((r) => r.includes('抛投'))).toBe(false);
    expect(five.score).toBe(66);
    expect(five.reasons.some((r) => r.includes('5级'))).toBe(true);
    expect(five.reasons.join('')).not.toMatch(/km\/h/);
  });

  it('盛夏无风与闷湿减分，不写溶氧数字', () => {
    const calm = buildFishingIndex(
      snap({ temperatureC: 22, windKmh: 3, humidityPct: 70, pressureHpa: 1007, pressureDelta3h: 0 }),
      dawn,
    );
    expect(calm.score).toBe(74);
    expect(calm.reasons.some((r) => r.includes('易闷'))).toBe(true);
    const muggy = buildFishingIndex(
      snap({ temperatureC: 22, windKmh: 8, humidityPct: 90, pressureHpa: 1007, pressureDelta3h: 0 }),
      dawn,
    );
    expect(muggy.score).toBe(72);
    expect(muggy.reasons.some((r) => r.includes('闷湿'))).toBe(true);
    expect(muggy.reasons.join('')).not.toMatch(/溶氧\s*\d/);
  });

  it('档位映射出钓文案', () => {
    expect(outingLabel('较高')).toBe('适宜出钓');
    expect(outingLabel('不宜')).toBe('不宜出钓');
  });

  it('未选水色时开口未知', () => {
    const idx = buildFishingIndex(snap({ temperatureC: 22 }), dawn);
    expect(idx.waterBite).toBe('开口未知');
  });
});
