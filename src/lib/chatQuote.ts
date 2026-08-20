import { isImageBody } from './chatImage';
import { isStickerBody } from './chatStickers';
import { isVoiceBody } from './chatVoice';
import { isRepostBody } from './shareRepost';
import { isVideoBody } from './userMedia';
import type { ChatQuote, HubChatMessage } from '../types';

export const QUOTE_PREVIEW_MAX = 36;
export const QUOTE_PREFIX = '#yjq:';

export function clipQuotePreview(raw: string, max = QUOTE_PREVIEW_MAX): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function parseQuotedBody(raw: string): { quote?: ChatQuote; body: string } {
  const match = raw.match(/^#yjq:([^|\n]+)\|([^|\n]*)\|([^\n]*)\n([\s\S]*)$/);
  if (!match) return { body: raw };
  return {
    quote: {
      id: match[1],
      author: match[2],
      preview: match[3],
    },
    body: match[4],
  };
}

export function encodeQuotedBody(quote: ChatQuote, body: string, max = 200): string {
  const id = quote.id.replace(/[|\n]/g, '');
  const author = quote.author.replace(/[|\n]/g, '').trim().slice(0, 12);
  let preview = clipQuotePreview(quote.preview.replace(/[|\n]/g, ' '));
  const prefix = (text: string) => `${QUOTE_PREFIX}${id}|${author}|${text}\n`;
  while (prefix(preview).length + body.length > max && preview.length) {
    preview = preview.slice(0, -1);
  }
  const packed = `${prefix(preview)}${body}`;
  return packed.length <= max ? packed : body;
}

export function quoteLabel(row: Pick<HubChatMessage, 'body' | 'kind'>): string {
  const inner = parseQuotedBody(row.body).body;
  if (row.kind === 'image' || isImageBody(inner)) return '[图片]';
  if (row.kind === 'video' || isVideoBody(inner)) return '[视频]';
  if (row.kind === 'voice' || isVoiceBody(inner)) return '[语音]';
  if (row.kind === 'sticker' || isStickerBody(inner)) return inner.trim();
  if (isRepostBody(inner)) return '转发渔获';
  return clipQuotePreview(inner);
}

export function makeQuote(row: HubChatMessage): ChatQuote {
  return {
    id: row.id,
    author: row.author,
    preview: quoteLabel(row),
  };
}

export function asChatQuote(value: unknown): ChatQuote | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== 'string' || !rec.id) return undefined;
  return {
    id: rec.id,
    author: typeof rec.author === 'string' ? rec.author : '',
    preview: clipQuotePreview(typeof rec.preview === 'string' ? rec.preview : ''),
  };
}
