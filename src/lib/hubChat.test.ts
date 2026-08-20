import { describe, expect, it } from 'vitest';
import {
  chatLoadErrorMessage,
  clipChatAuthor,
  draftChatBody,
  isChatRoomId,
  mapChatRow,
  mergeChatMessage,
} from './hubChat';

describe('draftChatBody', () => {
  it('去空格；空文案与超长不发送', () => {
    expect(draftChatBody('   ')).toBeNull();
    expect(draftChatBody('')).toBeNull();
    expect(draftChatBody('明天滴水湖见')).toBe('明天滴水湖见');
    expect(draftChatBody(`  ${'啊'.repeat(200)}  `)).toBe('啊'.repeat(200));
    expect(draftChatBody('啊'.repeat(201))).toBeNull();
  });
});

describe('isChatRoomId', () => {
  it('只允许四个主题群', () => {
    expect(isChatRoomId('room-lure')).toBe(true);
    expect(isChatRoomId('room-ji')).toBe(true);
    expect(isChatRoomId('room-gear')).toBe(true);
    expect(isChatRoomId('room-match')).toBe(true);
    expect(isChatRoomId('room-other')).toBe(false);
  });
});

describe('mapChatRow', () => {
  it('云端行变成用户消息', () => {
    expect(
      mapChatRow({
        id: '11111111-1111-1111-1111-111111111111',
        room_id: 'room-lure',
        user_id: 'user-1',
        author: '阿周',
        body: '今晚见',
        created_at: '2026-08-18T12:00:00.000Z',
      }),
    ).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      roomId: 'room-lure',
      userId: 'user-1',
      author: '阿周',
      body: '今晚见',
      createdAt: '2026-08-18T12:00:00.000Z',
      source: 'user',
      kind: 'text',
      durationMs: undefined,
      mediaUrl: undefined,
    });
  });

  it('缺字段则丢掉', () => {
    expect(mapChatRow({ id: 'x', body: 'hi' })).toBeNull();
    expect(mapChatRow(null)).toBeNull();
  });

  it('视频正文标成 video 并带上 media_url', () => {
    expect(
      mapChatRow({
        id: 'v1',
        room_id: 'room-lure',
        user_id: 'user-1',
        author: '阿周',
        body: '[视频]',
        created_at: '2026-08-19T12:00:00.000Z',
        kind: 'video',
        duration_ms: 4000,
        media_url: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/chat/a.mp4',
      }),
    ).toMatchObject({
      kind: 'video',
      durationMs: 4000,
      mediaUrl: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/chat/a.mp4',
    });
  });

  it('引用列变成 replyTo，正文前缀也能拆开', () => {
    expect(
      mapChatRow({
        id: 'r1',
        room_id: 'room-lure',
        user_id: 'user-1',
        author: '阿周',
        body: '我也去',
        created_at: '2026-08-19T12:00:00.000Z',
        reply_to_id: 'm1',
        reply_author: '老张',
        reply_preview: '今晚见',
      })?.replyTo,
    ).toEqual({ id: 'm1', author: '老张', preview: '今晚见' });
    expect(
      mapChatRow({
        id: 'r2',
        room_id: 'room-lure',
        user_id: 'user-1',
        author: '阿周',
        body: '#yjq:m1|老张|今晚见\n我也去',
        created_at: '2026-08-19T12:00:00.000Z',
      }),
    ).toMatchObject({
      body: '我也去',
      replyTo: { id: 'm1', author: '老张', preview: '今晚见' },
    });
  });

  it('图片正文标成 image', () => {
    expect(
      mapChatRow({
        id: 'p1',
        room_id: 'room-lure',
        user_id: 'user-1',
        author: '阿周',
        body: '[图片]',
        created_at: '2026-08-19T12:00:00.000Z',
      })?.kind,
    ).toBe('image');
  });

  it('转发正文标成 share', () => {
    expect(
      mapChatRow({
        id: 's1',
        room_id: 'room-lure',
        user_id: 'user-1',
        author: '阿周',
        body: '转发 · 路亚阿周 在滴水湖 钓到鲈鱼 #yj:xhs-dishui',
        created_at: '2026-08-19T12:00:00.000Z',
      })?.kind,
    ).toBe('share');
  });
});

describe('mergeChatMessage', () => {
  it('按 id 去重', () => {
    const first = mapChatRow({
      id: 'a',
      room_id: 'room-ji',
      user_id: 'u',
      author: '阿周',
      body: '1',
      created_at: '2026-08-18T12:00:00.000Z',
    });
    expect(first).not.toBeNull();
    if (!first) return;
    expect(mergeChatMessage([first], first)).toEqual([first]);
    expect(mergeChatMessage([], first)).toEqual([first]);
  });
});

describe('clipChatAuthor', () => {
  it('空名回落沪上钓友，超长截断', () => {
    expect(clipChatAuthor('  ')).toBe('沪上钓友');
    expect(clipChatAuthor('一二三四五六七八九十再多了')).toBe('一二三四五六七八九十再多');
  });
});

describe('chatLoadErrorMessage', () => {
  it('缺表时提示去跑 SQL', () => {
    expect(chatLoadErrorMessage(new Error('Could not find the table public.chat_messages in the schema cache'))).toMatch(
      /chat_messages\.sql/,
    );
  });
});
