import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { canStartDirectMessage, dmThreadId, isMutualFollow, loadDmAllows, setDmAllow } from './directChat';

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

afterEach(() => {
  mem.clear();
});

describe('canStartDirectMessage', () => {
  it('必须互关且双方打开开关', () => {
    expect(canStartDirectMessage({ mutual: true, myAllow: true, peerAllow: true })).toBe(true);
    expect(canStartDirectMessage({ mutual: false, myAllow: true, peerAllow: true })).toBe(false);
    expect(canStartDirectMessage({ mutual: true, myAllow: false, peerAllow: true })).toBe(false);
    expect(canStartDirectMessage({ mutual: true, myAllow: true, peerAllow: false })).toBe(false);
  });
});

describe('isMutualFollow', () => {
  it('关注名单含该粉丝名才算互关', () => {
    expect(isMutualFollow('沪上老张', ['沪上老张', '路亚阿周'])).toBe(true);
    expect(isMutualFollow('沪上老张', ['路亚阿周'])).toBe(false);
  });
});

describe('setDmAllow', () => {
  it('能记下开关', () => {
    expect(loadDmAllows()['fan-zhang']).toBeUndefined();
    expect(setDmAllow('fan-zhang', true)['fan-zhang']).toBe(true);
    expect(loadDmAllows()['fan-zhang']).toBe(true);
  });
});

describe('dmThreadId', () => {
  it('按用户和对方拼会话 id', () => {
    expect(dmThreadId('uid-1', 'fan-zhang')).toBe('dm:uid-1:fan-zhang');
  });
});
