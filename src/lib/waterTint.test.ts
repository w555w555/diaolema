import { describe, expect, it } from 'vitest';
import { inferWaterTint, visibilityLabel } from './waterTint';

describe('inferWaterTint', () => {
  it('少雨 → 偏清，并写明不是测站', () => {
    const hit = inferWaterTint({ precipNowMm: 0, precip6hMm: 0, precip24hMm: 0.4, weatherCode: 1 });
    expect(hit.tint).toBe('偏清');
    expect(hit.note).toMatch(/不是测站/);
  });

  it('有雨或近 6 小时有雨 → 微浑', () => {
    expect(inferWaterTint({ precipNowMm: 1.2, precip6hMm: 0, precip24hMm: 0, weatherCode: 61 }).tint).toBe('微浑');
    expect(inferWaterTint({ precipNowMm: 0, precip6hMm: 1.5, precip24hMm: 1.5, weatherCode: 2 }).tint).toBe('微浑');
  });

  it('大雨或近 24 小时降水偏多 → 浑浊', () => {
    expect(inferWaterTint({ precipNowMm: 0, precip6hMm: 0, precip24hMm: 9, weatherCode: 3 }).tint).toBe('浑浊');
    expect(inferWaterTint({ precipNowMm: 0, precip6hMm: 6, precip24hMm: 6, weatherCode: 2 }).tint).toBe('浑浊');
    expect(inferWaterTint({ precipNowMm: 2, precip6hMm: 2, precip24hMm: 2, weatherCode: 95 }).tint).toBe('浑浊');
  });
});

describe('visibilityLabel', () => {
  it('空气能见度写成 km 或 m，缺测为 —', () => {
    expect(visibilityLabel(12000)).toBe('12 km');
    expect(visibilityLabel(800)).toBe('800 m');
    expect(visibilityLabel(null)).toBe('—');
  });
});
