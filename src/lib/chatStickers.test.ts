import { describe, expect, it } from 'vitest';
import { CHAT_STICKERS, isStickerBody, stickerByGlyph } from './chatStickers';

describe('chatStickers', () => {
  it('resolves pack glyphs', () => {
    expect(CHAT_STICKERS.length).toBeGreaterThanOrEqual(8);
    expect(stickerByGlyph('🐟')?.name).toBe('鱼');
    expect(isStickerBody('🐟')).toBe(true);
    expect(isStickerBody('明天滴水湖见')).toBe(false);
  });
});
