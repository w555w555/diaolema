export type ChatSticker = {
  id: string;
  glyph: string;
  name: string;
};

export const CHAT_STICKERS: ChatSticker[] = [
  { id: 'ok', glyph: '👍', name: '赞' },
  { id: 'fish', glyph: '🐟', name: '鱼' },
  { id: 'hook', glyph: '🎣', name: '竿' },
  { id: 'wave', glyph: '🌊', name: '水' },
  { id: 'sun', glyph: '☀️', name: '晴' },
  { id: 'moon', glyph: '🌙', name: '夜' },
  { id: 'fire', glyph: '🔥', name: '爆护' },
  { id: 'cry', glyph: '😢', name: '空军' },
  { id: 'cool', glyph: '😎', name: '稳' },
  { id: 'clap', glyph: '👏', name: '好' },
  { id: 'shrimp', glyph: '🦐', name: '虾' },
  { id: 'boat', glyph: '🚤', name: '船' },
];

export function stickerByGlyph(raw: string): ChatSticker | null {
  const text = raw.trim();
  return CHAT_STICKERS.find((row) => row.glyph === text) ?? null;
}

export function isStickerBody(raw: string): boolean {
  return Boolean(stickerByGlyph(raw));
}
