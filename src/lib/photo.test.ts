import { describe, expect, it } from 'vitest';
import { packedToDataUrl, stripInlineImage } from './photo';

describe('packedToDataUrl', () => {
  it('拼成 data URL', () => {
    expect(packedToDataUrl({ mime: 'image/jpeg', imageBase64: 'abc' })).toBe('data:image/jpeg;base64,abc');
  });
});

describe('stripInlineImage', () => {
  it('去掉 data URL，外链保留', () => {
    expect(stripInlineImage({ fish: '鲈鱼', imageUrl: 'data:image/jpeg;base64,xx' })).toEqual({ fish: '鲈鱼' });
    expect(stripInlineImage({ fish: '鲈鱼', imageUrl: 'https://example.com/a.jpg' })).toEqual({
      fish: '鲈鱼',
      imageUrl: 'https://example.com/a.jpg',
    });
  });

  it('多图和视频的 data URL 也去掉', () => {
    expect(
      stripInlineImage({
        fish: '鲈鱼',
        imageUrl: '/shares/a.png',
        imageUrls: ['data:image/jpeg;base64,xx', '/shares/b.png'],
        videoUrl: 'data:video/mp4;base64,yy',
      }),
    ).toEqual({
      fish: '鲈鱼',
      imageUrl: '/shares/a.png',
      imageUrls: ['/shares/b.png'],
    });
  });
});
