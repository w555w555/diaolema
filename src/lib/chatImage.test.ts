import { describe, expect, it } from 'vitest';
import { IMAGE_BODY, isImageBody } from './chatImage';

describe('isImageBody', () => {
  it('only matches the picture marker', () => {
    expect(IMAGE_BODY).toBe('[图片]');
    expect(isImageBody('[图片]')).toBe(true);
    expect(isImageBody('  [图片]  ')).toBe(true);
    expect(isImageBody('[语音 3″]')).toBe(false);
    expect(isImageBody('发张图')).toBe(false);
  });
});
