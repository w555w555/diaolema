import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hideByAuthor, hideInboxFromBlocked } from './userSafety';
import {
  applyBlocks,
  blockAuthor,
  getSafety,
  hydrateSafety,
  isBlocked,
  reportAuthor,
  unblockAuthor,
} from './userSafety';
import type { InboxItem } from './chatInbox';

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
  hydrateSafety();
});

afterEach(() => mem.clear());

describe('blockAuthor', () => {
  it('按作者名拉黑，不能拉黑自己', () => {
    expect(blockAuthor('路亚阿周', '沪上钓友').blocks).toEqual(['路亚阿周']);
    expect(isBlocked('路亚阿周')).toBe(true);
    expect(blockAuthor('沪上钓友', '沪上钓友').blocks).toEqual(['路亚阿周']);
    expect(unblockAuthor('路亚阿周').blocks).toEqual([]);
    expect(isBlocked('路亚阿周')).toBe(false);
  });

  it('云端拉黑名单与本机并集', () => {
    blockAuthor('路亚阿周');
    expect(applyBlocks(['南汇小路', '路亚阿周']).blocks).toEqual(['路亚阿周', '南汇小路']);
  });
});

describe('reportAuthor', () => {
  it('须选原因并留下记录', () => {
    const row = reportAuthor('路亚阿周', 'fake');
    expect(row).toMatchObject({ author: '路亚阿周', reason: 'fake' });
    expect(getSafety().reports[0].reason).toBe('fake');
    expect(reportAuthor('  ', 'spam')).toBeNull();
  });
});

describe('hideByAuthor', () => {
  it('渔获和评论去掉已拉黑人', () => {
    const rows = [
      { id: '1', author: '路亚阿周' },
      { id: '2', author: '南汇小路' },
    ];
    expect(hideByAuthor(rows, ['路亚阿周']).map((row) => row.id)).toEqual(['2']);
  });
});

describe('hideInboxFromBlocked', () => {
  it('去掉已拉黑人的私信会话，主题群仍在', () => {
    const items: InboxItem[] = [
      { id: 'dm:fan-zhou', kind: 'dm', title: '路亚阿周', preview: '你好', at: '1', unread: 1, peerId: 'fan-zhou' },
      { id: 'room-lure', kind: 'room', title: '路亚夜聊', preview: '口讯', at: '2', unread: 0 },
    ];
    expect(hideInboxFromBlocked(items, ['路亚阿周']).map((row) => row.id)).toEqual(['room-lure']);
  });
});
