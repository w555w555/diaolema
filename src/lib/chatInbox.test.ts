import { beforeEach, describe, expect, it } from 'vitest';
import { createChatMessage } from './hub';
import {
  buildInbox,
  firstUnreadId,
  inboxUnreadTotal,
  isPeerThread,
  loadReads,
  markThreadRead,
  previewLine,
  searchInbox,
  searchMessages,
  unreadCount,
} from './chatInbox';
import type { HubChatMessage, HubRoom } from '../types';

const mem = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => mem.get(key) ?? null,
  setItem: (key: string, value: string) => {
    mem.set(key, value);
  },
  removeItem: (key: string) => {
    mem.delete(key);
  },
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
} as Storage;

beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage });
});

const rooms: HubRoom[] = [
  { id: 'room-lure', name: '路亚夜聊', topic: '亮片', members: 12 },
  { id: 'room-ji', name: '台钓鲫鱼', topic: '拉饵', members: 8 },
];

function msg(partial: Partial<HubChatMessage> & Pick<HubChatMessage, 'roomId' | 'body'>): HubChatMessage {
  return {
    ...createChatMessage({ roomId: partial.roomId, body: partial.body, author: partial.author ?? '路亚阿周' }),
    ...partial,
    source: partial.source ?? 'seed',
  };
}

describe('previewLine', () => {
  it('maps media and share to short labels', () => {
    expect(previewLine(msg({ roomId: 'room-lure', body: '[视频]', kind: 'video' }))).toBe('[视频]');
    expect(previewLine(msg({ roomId: 'room-lure', body: '[图片]', kind: 'image' }))).toBe('[图片]');
    expect(previewLine(msg({ roomId: 'room-lure', body: '[语音 4″]', kind: 'voice' }))).toBe('[语音]');
    expect(previewLine(msg({ roomId: 'room-lure', body: '👍', kind: 'sticker' }))).toBe('👍');
    expect(previewLine(msg({ roomId: 'room-lure', body: '转发 · 路亚阿周 在滴水湖 钓到鲈鱼 #yj:xhs-dishui' }))).toBe(
      '转发 · 路亚阿周 在滴水湖 钓到鲈鱼',
    );
    expect(previewLine(msg({ roomId: 'room-lure', body: '今晚见' }))).toBe('今晚见');
    expect(
      previewLine(
        msg({
          roomId: 'room-lure',
          body: '我也去',
          replyTo: { id: 'm1', author: '阿周', preview: '今晚见' },
        }),
      ),
    ).toBe('回复 · 我也去');
  });
});

describe('firstUnreadId', () => {
  it('只在已有 lastRead 时指向第一条别人的新消息', () => {
    const rows = [
      msg({ id: 'a', roomId: 'room-lure', body: '旧', createdAt: '2026-08-19T01:00:00.000Z', source: 'seed' }),
      msg({ id: 'b', roomId: 'room-lure', body: '新', createdAt: '2026-08-19T03:00:00.000Z', source: 'seed' }),
    ];
    expect(firstUnreadId(rows, undefined, null, false)).toBeUndefined();
    expect(firstUnreadId(rows, '2026-08-19T02:00:00.000Z', null, false)).toBe('b');
  });
});

describe('searchInbox / searchMessages', () => {
  it('按标题或正文过滤；空查询原样返回', () => {
    const messages = [
      msg({ id: '1', roomId: 'room-lure', body: '滴水湖口讯', author: '阿周' }),
      msg({ id: '2', roomId: 'room-ji', body: '拉饵', author: '老张' }),
    ];
    expect(searchMessages(messages, '  ').map((row) => row.id)).toEqual(['1', '2']);
    expect(searchMessages(messages, '滴水').map((row) => row.id)).toEqual(['1']);
    expect(searchMessages(messages, '老张').map((row) => row.id)).toEqual(['2']);
    const inbox = buildInbox({
      rooms,
      messages,
      fans: [],
      reads: {},
      myUserId: null,
      cloud: false,
    });
    expect(searchInbox(inbox, '鲫').map((row) => row.id)).toEqual(['room-ji']);
  });
});

describe('unreadCount', () => {
  it('counts later messages that are not mine', () => {
    const rows = [
      msg({ roomId: 'room-lure', body: '旧', createdAt: '2026-08-19T01:00:00.000Z', source: 'seed' }),
      msg({ roomId: 'room-lure', body: '新', createdAt: '2026-08-19T03:00:00.000Z', source: 'seed' }),
      msg({ roomId: 'room-lure', body: '我', createdAt: '2026-08-19T04:00:00.000Z', source: 'user' }),
    ];
    expect(unreadCount(rows, '2026-08-19T02:00:00.000Z', null, false)).toBe(1);
    expect(unreadCount(rows, undefined, null, false)).toBe(2);
  });
});

describe('isPeerThread', () => {
  it('matches local and cloud dm ids', () => {
    expect(isPeerThread('dm:fan-zhou', 'fan-zhou')).toBe(true);
    expect(isPeerThread('dm:uid-1:fan-zhou', 'fan-zhou')).toBe(true);
    expect(isPeerThread('dm:fan-zhang', 'fan-zhou')).toBe(false);
    expect(isPeerThread('room-lure', 'fan-zhou')).toBe(false);
  });
});

describe('buildInbox', () => {
  it('lists rooms and dm threads with unread', () => {
    markThreadRead('room-lure', '2026-08-19T10:00:00.000Z');
    const messages = [
      msg({ roomId: 'room-lure', body: '已读', createdAt: '2026-08-19T09:00:00.000Z' }),
      msg({ roomId: 'room-ji', body: '未读口讯', createdAt: '2026-08-19T11:00:00.000Z' }),
      msg({
        roomId: 'dm:fan-zhou',
        body: '[图片]',
        kind: 'image',
        createdAt: '2026-08-19T12:00:00.000Z',
        author: '我',
        source: 'user',
      }),
    ];
    const rows = buildInbox({
      rooms,
      messages,
      fans: [{ id: 'fan-zhou', name: '路亚阿周' }],
      reads: loadReads(),
      myUserId: null,
      cloud: false,
    });
    expect(rows.map((row) => row.id)).toEqual(['dm:fan-zhou', 'room-ji', 'room-lure']);
    expect(rows[0]).toMatchObject({ kind: 'dm', title: '路亚阿周', preview: '[图片]', unread: 0 });
    expect(rows.find((row) => row.id === 'room-ji')?.unread).toBe(1);
    expect(rows.find((row) => row.id === 'room-lure')?.unread).toBe(0);
    expect(inboxUnreadTotal(rows)).toBe(1);
  });
});
