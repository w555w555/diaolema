import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistanceKm, geoErrorMessage, requestCurrentPosition } from './geo';

describe('geoErrorMessage', () => {
  it('不支持定位', () => {
    expect(geoErrorMessage({ supported: false, secure: true })).toContain('不支持定位');
  });

  it('非安全上下文', () => {
    expect(geoErrorMessage({ supported: true, secure: false })).toContain('HTTPS');
  });

  it('拒绝授权', () => {
    expect(geoErrorMessage({ supported: true, secure: true, code: 1 })).toContain('被拒绝');
  });

  it('拿不到位置', () => {
    expect(geoErrorMessage({ supported: true, secure: true, code: 2 })).toContain('拿不到');
  });

  it('超时', () => {
    expect(geoErrorMessage({ supported: true, secure: true, code: 3 })).toContain('超时');
  });
});

describe('requestCurrentPosition', () => {
  it('无 geolocation 时拒绝', async () => {
    await expect(requestCurrentPosition()).rejects.toThrow(/不支持定位|HTTPS/);
  });
});

describe('distanceKm', () => {
  it('同一点为 0', () => {
    expect(distanceKm({ lat: 31.23, lon: 121.47 }, { lat: 31.23, lon: 121.47 })).toBe(0);
  });

  it('赤道经度差 1 度约 111 公里', () => {
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.19, 1);
  });
});

describe('formatDistanceKm', () => {
  it('不足一公里写米，以上写公里', () => {
    expect(formatDistanceKm(0.03)).toBe('附近');
    expect(formatDistanceKm(0.3)).toBe('300米');
    expect(formatDistanceKm(1.2)).toBe('1.2公里');
    expect(formatDistanceKm(12)).toBe('12公里');
  });
});
