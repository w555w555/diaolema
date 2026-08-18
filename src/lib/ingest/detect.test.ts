import { describe, expect, it } from 'vitest';
import { DEFAULT_INGEST_CONFIG } from './config';
import { detectPlatform } from './detect';

describe('detectPlatform', () => {
  it('识别小红书域名', () => {
    const [id, name] = detectPlatform('https://www.xiaohongshu.com/explore/abc', DEFAULT_INGEST_CONFIG);
    expect(id).toBe('xiaohongshu');
    expect(name).toBe('小红书');
  });

  it('识别抖音短链', () => {
    const [id, name] = detectPlatform('https://v.douyin.com/xxx/', DEFAULT_INGEST_CONFIG);
    expect(id).toBe('douyin');
    expect(name).toBe('抖音');
  });

  it('识别微信公众号链接', () => {
    const [id, name] = detectPlatform('https://mp.weixin.qq.com/s/abc', DEFAULT_INGEST_CONFIG);
    expect(id).toBe('wechat');
    expect(name).toBe('微信公众号');
  });

  it('未知域名记为公开渔讯', () => {
    const [id, name] = detectPlatform('https://example.com/fish', DEFAULT_INGEST_CONFIG);
    expect(id).toBe('public');
    expect(name).toBe('公开渔讯');
  });
});
