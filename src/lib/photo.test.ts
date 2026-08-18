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
});
