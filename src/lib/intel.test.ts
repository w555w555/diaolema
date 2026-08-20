import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUserReport, isOwnedCatch, persistReport, removeReport } from './intel';

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

describe('removeReport', () => {
  it('只删本机用户渔获，不动示例', () => {
    const mine = createUserReport({
      id: 'user-keep-1',
      author: '阿周',
      fish: '鲈鱼',
      spotName: '滴水湖东岸',
      lon: 121.9,
      lat: 30.9,
    });
    persistReport(mine);
    expect(isOwnedCatch(mine.id)).toBe(true);
    const next = removeReport(mine.id);
    expect(next.some((row) => row.id === mine.id)).toBe(false);
    expect(isOwnedCatch(mine.id)).toBe(false);
    expect(next.some((row) => row.source !== 'user')).toBe(true);
  });
});
