import { describe, expect, it } from 'vitest';
import { DEFAULT_INGEST_CONFIG } from './config';
import { fetchPageText, htmlToText, isGatedUrl } from './fetchPage';

describe('htmlToText', () => {
  it('去掉标签和脚本', () => {
    expect(htmlToText('<html><script>alert(1)</script><p>滴水湖 鲈鱼</p></html>')).toBe('滴水湖 鲈鱼');
  });
});

describe('isGatedUrl', () => {
  it('小红书抖音微博视为登录墙', () => {
    expect(isGatedUrl('https://www.xiaohongshu.com/explore/1', DEFAULT_INGEST_CONFIG)).toBe(true);
    expect(isGatedUrl('https://v.douyin.com/abc', DEFAULT_INGEST_CONFIG)).toBe(true);
    expect(isGatedUrl('https://weibo.com/ttarticle/p/show?id=1', DEFAULT_INGEST_CONFIG)).toBe(true);
    expect(isGatedUrl('https://mp.weixin.qq.com/s/abc', DEFAULT_INGEST_CONFIG)).toBe(true);
    expect(isGatedUrl('https://www.zhihu.com/question/1', DEFAULT_INGEST_CONFIG)).toBe(true);
    expect(isGatedUrl('https://www.bilibili.com/video/BV1', DEFAULT_INGEST_CONFIG)).toBe(false);
    expect(isGatedUrl('https://news.example.com/fish', DEFAULT_INGEST_CONFIG)).toBe(false);
  });
});

describe('fetchPageText', () => {
  it('登录墙域名不发请求', async () => {
    let called = false;
    const text = await fetchPageText('https://www.xiaohongshu.com/explore/1', DEFAULT_INGEST_CONFIG, {
      fetchImpl: async () => {
        called = true;
        return new Response('should not fetch');
      },
    });
    expect(text).toBe('');
    expect(called).toBe(false);
  });

  it('公开网页抽取正文', async () => {
    const text = await fetchPageText('https://news.example.com/a', DEFAULT_INGEST_CONFIG, {
      fetchImpl: async () =>
        new Response('<html><body><h1>崇明 钓到了鲫鱼</h1></body></html>', {
          headers: { 'content-type': 'text/html' },
        }),
    });
    expect(text).toContain('崇明');
    expect(text).toContain('鲫鱼');
  });
});
