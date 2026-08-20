import { describe, expect, it } from 'vitest';
import { CHAT_BODY_MAX } from './hubChat';
import {
  clipQuotePreview,
  encodeQuotedBody,
  makeQuote,
  parseQuotedBody,
} from './chatQuote';
import type { HubChatMessage } from '../types';

function row(partial: Partial<HubChatMessage> & Pick<HubChatMessage, 'body'>): HubChatMessage {
  return {
    id: 'm1',
    roomId: 'room-lure',
    author: '阿周',
    createdAt: '2026-08-19T12:00:00.000Z',
    source: 'user',
    ...partial,
  };
}

describe('clipQuotePreview', () => {
  it('截到 36 字', () => {
    expect(clipQuotePreview('今晚滴水湖见')).toBe('今晚滴水湖见');
    expect(clipQuotePreview('啊'.repeat(40)).length).toBe(36);
  });
});

describe('encodeQuotedBody / parseQuotedBody', () => {
  it('能把引用和正文拆开', () => {
    const packed = encodeQuotedBody({ id: 'm1', author: '阿周', preview: '今晚见' }, '我也去');
    expect(packed.startsWith('#yjq:')).toBe(true);
    expect(packed.length).toBeLessThanOrEqual(CHAT_BODY_MAX);
    expect(parseQuotedBody(packed)).toEqual({
      quote: { id: 'm1', author: '阿周', preview: '今晚见' },
      body: '我也去',
    });
  });

  it('普通正文没有引用', () => {
    expect(parseQuotedBody('今晚见')).toEqual({ body: '今晚见' });
  });
});

describe('makeQuote', () => {
  it('用预览而不是整段正文', () => {
    expect(makeQuote(row({ id: 'x', body: '[图片]', kind: 'image' }))).toEqual({
      id: 'x',
      author: '阿周',
      preview: '[图片]',
    });
  });
});
