import { describe, expect, it } from 'vitest';
import { buildAmapNavUrl, buildAmapOpenUrl } from './navigation';

describe('buildAmapNavUrl', () => {
  it('生成可跳转高德导航的驾车链接', () => {
    const url = buildAmapNavUrl({
      fromLon: 121.473701,
      fromLat: 31.230416,
      fromName: '人民广场',
      toLon: 121.9335,
      toLat: 30.9085,
      toName: '滴水湖',
      mode: 'car',
    });
    expect(url.startsWith('https://uri.amap.com/navigation?')).toBe(true);
    expect(url).toContain('from=121.473701,31.230416,');
    expect(url).toContain('to=121.9335,30.9085,');
    expect(url).toContain('mode=car');
    expect(url).toContain('callnative=1');
    expect(url).toContain(encodeURIComponent('滴水湖'));
  });

  it('生成可打开高德地图标点的链接', () => {
    const url = buildAmapOpenUrl(121.473701, 31.230416, '人民广场');
    expect(url.startsWith('https://uri.amap.com/marker?')).toBe(true);
    expect(url).toContain('position=121.473701,31.230416');
    expect(url).toContain('callnative=1');
  });
});
