import { describe, expect, it } from 'vitest';
import { detectPlatform, parseShareText } from './parseShare';

const fallback = { lon: 121.47, lat: 31.23 };

describe('parseShareText', () => {
  it('解析小红书分享：谁、多久前、钓到什么鱼、钓点', () => {
    const p = parseShareText('路亚阿周发布了一篇小红书笔记：3小时前在滴水湖路亚中鲈鱼 https://www.xiaohongshu.com/discovery/item/abc', fallback);
    expect(p).not.toBeNull();
    expect(p?.source).toBe('xiaohongshu');
    expect(p?.author).toBe('路亚阿周');
    expect(p?.fish).toBe('鲈鱼');
    expect(p?.spotName).toBe('滴水湖');
    expect(p?.hoursAgo).toBe(3);
    expect(p?.sourceUrl).toContain('xiaohongshu.com');
  });

  it('解析抖音分享', () => {
    const p = parseShareText('阿强在抖音分享：昨天淀山湖钓到了鲫鱼 https://v.douyin.com/xxx/', fallback);
    expect(p?.source).toBe('douyin');
    expect(p?.fish).toBe('鲫鱼');
    expect(p?.spotName).toBe('淀山湖');
    expect(p?.hoursAgo).toBe(24);
  });
});

describe('detectPlatform', () => {
  it('识别微博', () => {
    expect(detectPlatform('微博看到吴淞口有人中翘嘴')).toBe('weibo');
  });
});
