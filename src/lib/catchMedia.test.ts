import { describe, expect, it } from 'vitest';
import {
  CATCH_IMAGE_MAX,
  catchImages,
  catchMediaBadge,
  catchVideoError,
  catchVideoUrl,
  clipCatchImages,
  parsePackedImageUrls,
} from './catchMedia';

describe('clipCatchImages', () => {
  it('去空、去重，最多 9 张', () => {
    const urls = ['a.jpg', ' a.jpg ', '', 'b.jpg', ...Array.from({ length: 12 }, (_, i) => `n${i}.jpg`)];
    expect(clipCatchImages(urls)).toEqual(['a.jpg', 'b.jpg', ...Array.from({ length: 7 }, (_, i) => `n${i}.jpg`)]);
    expect(clipCatchImages(urls)).toHaveLength(CATCH_IMAGE_MAX);
  });
});

describe('catchImages', () => {
  it('封面加后续图，去掉重复', () => {
    expect(
      catchImages({
        imageUrl: '/shares/a.png',
        imageUrls: ['/shares/a.png', '/shares/b.png'],
      }),
    ).toEqual(['/shares/a.png', '/shares/b.png']);
    expect(catchImages({ fish: '鲈鱼' } as { imageUrl?: string })).toEqual([]);
  });
});

describe('catchMediaBadge', () => {
  it('有视频优先播放角标，否则多图显示张数', () => {
    expect(catchMediaBadge({ videoUrl: '/v.mp4', imageUrl: '/a.png' })).toEqual({ kind: 'video' });
    expect(catchMediaBadge({ imageUrl: '/a.png', imageUrls: ['/b.png'] })).toEqual({ kind: 'album', count: 2 });
    expect(catchMediaBadge({ imageUrl: '/a.png' })).toBeNull();
  });
});

describe('catchVideoError', () => {
  it('拒绝非视频、过大或超过 15 秒', () => {
    expect(catchVideoError({ type: 'image/jpeg', size: 10 })).toBe('请选择视频');
    expect(catchVideoError({ type: 'video/mp4', size: 9 * 1024 * 1024 })).toBe('视频超过 8 MB');
    expect(catchVideoError({ type: 'video/mp4', size: 1000 }, 16_000)).toBe('短视频最长 15 秒');
    expect(catchVideoError({ type: 'video/mp4', size: 1000 }, 8_000)).toBeNull();
  });
});

describe('catchVideoUrl', () => {
  it('空文案不算视频', () => {
    expect(catchVideoUrl({ videoUrl: '  ' })).toBeUndefined();
    expect(catchVideoUrl({ videoUrl: '/v.mp4' })).toBe('/v.mp4');
  });
});

describe('parsePackedImageUrls', () => {
  it('读 JSON 数组或字符串数组，丢掉空项', () => {
    expect(parsePackedImageUrls('["https://a/x.jpg","https://a/y.jpg"]')).toEqual(['https://a/x.jpg', 'https://a/y.jpg']);
    expect(parsePackedImageUrls(['https://a/x.jpg', '', 'https://a/x.jpg'])).toEqual(['https://a/x.jpg']);
    expect(parsePackedImageUrls('not-json')).toEqual([]);
  });
});
