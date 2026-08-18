import { describe, expect, it } from 'vitest';
import { geoErrorMessage, requestCurrentPosition } from './geo';

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
