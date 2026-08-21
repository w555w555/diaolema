import { describe, expect, it } from 'vitest';
import {
  flavorSliderPct,
  homeIndexTags,
  hourBarHeights,
  indexRingOffset,
  layerBand,
  layerStance,
  layerMarkerPct,
  layerWhyRows,
  outingShort,
  precipWetDry,
  pressureTrend,
  weatherPointNote,
  windowNowPct,
  planFromLine,
} from './homeView';
import { SHANGHAI_CENTER } from '../types';

describe('homeView', () => {
  it('maps water layers to 上/中/底 and places the fish marker', () => {
    expect(layerBand('上层')).toBe('上');
    expect(layerBand('中上层')).toBe('中');
    expect(layerBand('中下层')).toBe('中');
    expect(layerBand('底层')).toBe('底');
    expect(layerMarkerPct('中下层')).toBeGreaterThan(layerMarkerPct('中上层'));
    expect(layerMarkerPct('底层')).toBeGreaterThan(layerMarkerPct('中下层'));
    expect(layerStance('底层')).toBe('守底');
    expect(layerStance('底层', '路亚')).toBe('搜底层');
    expect(layerStance('中下层')).toBe('搜中下');
  });

  it('places flavor on the 大腥–清淡 slider', () => {
    expect(flavorSliderPct('大腥')).toBeLessThan(flavorSliderPct('香腥'));
    expect(flavorSliderPct('香腥')).toBeLessThan(flavorSliderPct('本味清淡'));
  });

  it('does not treat dry air as rain', () => {
    expect(precipWetDry(0, 2)).toBe('干');
    expect(precipWetDry(1.2, 61)).toBe('有雨');
  });

  it('labels 3h pressure without inventing oxygen', () => {
    expect(pressureTrend(-0.8)).toBe('缓降');
    expect(pressureTrend(-1.6)).toBe('急降');
    expect(pressureTrend(0.1)).toBe('走稳');
    expect(weatherPointNote(SHANGHAI_CENTER.lat, SHANGHAI_CENTER.lon)).toMatch(/不是水体/);
    expect(weatherPointNote(31.1, 121.8)).toMatch(/不是水温溶氧/);
  });

  it('fills the index ring from 0–100', () => {
    expect(indexRingOffset(0)).toBeGreaterThan(indexRingOffset(78));
    expect(indexRingOffset(100)).toBe(0);
  });

  it('scales hourly bars and window needle', () => {
    const bars = hourBarHeights([24, 22, 20, 18, 16, 14]);
    expect(bars[0]).toBeGreaterThan(bars[5]);
    expect(windowNowPct(new Date('2026-08-20T12:00:00'))).toBeCloseTo(50, 0);
  });

  it('方案来源写明钓法水色与对象鱼', () => {
    expect(planFromLine({ style: '路亚', fish: '鲈鱼', sightedWater: '浑浊', rainTint: '浑浊', tempC: 22 })).toBe(
      '由路亚 · 鲈鱼 · 目测浑浊 · 22°算出',
    );
    expect(planFromLine({ style: '台钓', fish: '鲫鱼', sightedWater: null, rainTint: '偏清', tempC: 24 })).toMatch(
      /未目测·降水偏清/,
    );
  });

  it('较高写成宜出钓，why 行不写开口溶氧', () => {
    expect(outingShort('较高')).toBe('宜出钓');
    const why = layerWhyRows({
      fish: '鲫鱼',
      habitat: '缓坡、草边。',
      layer: '底层',
      pressureHpa: 1016,
      deltaHpa: -0.8,
      trend: '缓降',
      precip: '干',
      sightedWater: null,
    });
    expect(why[0]?.k).toBe('鱼');
    expect(why.map((row) => row.v).join('')).not.toMatch(/开口|溶氧实测/);
    const tags = homeIndexTags({
      score: 78,
      label: '较高',
      reasons: ['气温 24°C，出门体感合适'],
      precip: '干',
      wind: '2级',
    });
    expect(tags[0]?.text).toMatch(/钓鱼推荐指数 78 较高/);
    expect(tags.some((tag) => tag.text === '气温适宜')).toBe(true);
  });
});
