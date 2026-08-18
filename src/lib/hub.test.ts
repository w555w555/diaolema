import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendChatMessage,
  createChatMessage,
  HUB_PRODUCTS,
  HUB_ROOMS,
  loadChatMessages,
  messagesForRoom,
  toggleWish,
} from './hub';
import { saveProfile } from './meProfile';

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

describe('toggleWish', () => {
  afterEach(() => {
    mem.clear();
  });

  it('加入后再点一次会取消', () => {
    const productId = HUB_PRODUCTS[0].id;
    expect(toggleWish(productId, [])).toEqual([productId]);
    expect(toggleWish(productId, [productId])).toEqual([]);
  });
});

describe('messagesForRoom', () => {
  it('只返回该群并按时间正序', () => {
    const rows = [
      createChatMessage({ roomId: 'room-lure', body: '后发', author: '我' }),
      { ...createChatMessage({ roomId: 'room-ji', body: '别的群', author: '他' }), createdAt: '2026-08-01T00:00:00.000Z' },
      { ...createChatMessage({ roomId: 'room-lure', body: '先发', author: '他' }), createdAt: '2026-08-01T00:00:00.000Z' },
    ];
    expect(messagesForRoom('room-lure', rows).map((row) => row.body)).toEqual(['先发', '后发']);
  });
});

describe('appendChatMessage', () => {
  afterEach(() => {
    mem.clear();
  });

  it('空文案不写入，有内容则进该群', () => {
    const roomId = HUB_ROOMS[0].id;
    const before = loadChatMessages().length;
    expect(appendChatMessage(roomId, '   ').length).toBe(before);
    saveProfile({ name: '阿周' });
    const next = appendChatMessage(roomId, '明天滴水湖见');
    expect(
      messagesForRoom(roomId, next).some(
        (row) => row.body === '明天滴水湖见' && row.source === 'user' && row.author === '阿周',
      ),
    ).toBe(true);
  });
});
