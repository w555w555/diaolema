import { describe, expect, it } from 'vitest';
import { catchThumb, shareBody, shareCover, shareExcerpt } from './catchThumb';

describe('shareCover', () => {
  it('无实拍时用深色底加大号鱼名', () => {
    const url = shareCover({ fish: '鲈鱼' });
    expect(url.startsWith('data:image/svg+xml')).toBe(true);
    expect(decodeURIComponent(url)).toContain('鲈鱼');
    expect(catchThumb('鲈鱼')).not.toBe(catchThumb('鲫鱼'));
  });

  it('有 imageUrl 时用实拍', () => {
    expect(shareCover({ fish: '鲈鱼', imageUrl: 'https://example.com/lu.jpg' })).toBe('https://example.com/lu.jpg');
  });

  it('摘要去掉示例声明并截断', () => {
    expect(shareExcerpt('湖湾拉饵。示例短文，仅供界面演示。')).toBe('湖湾拉饵。');
  });

  it('正文去掉示例声明但不截断', () => {
    const note = '湖湾拉饵，口很轻。示例短文，仅供界面演示。';
    expect(shareBody(note)).toBe('湖湾拉饵，口很轻。');
    expect(shareBody(note)).not.toContain('示例短文');
  });
});
