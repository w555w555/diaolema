import { describe, expect, it } from 'vitest';
import {
  flavorSliderPct,
  hourBarHeights,
  indexRingOffset,
  layerBand,
  layerStance,
  precipWetDry,
  pressureTrend,
  windowNowPct,
} from './homeView';

describe('homeView', () => {
  it('maps water layers to 上/中/底', () => {
    expect(layerBand('上层')).toBe('上');
    expect(layerBand('中上层')).toBe('上');
    expect(layerBand('中下层')).toBe('中');
    expect(layerBand('底层')).toBe('底');
    expect(layerStance('底层')).toBe('守底');
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
});
