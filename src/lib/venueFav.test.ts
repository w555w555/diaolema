import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isVenueFaved, loadVenueFavIds, toggleVenueFav, unionVenueFavIds } from './venueFav';

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

describe('toggleVenueFav', () => {
  it('加入后再点一次会取消', () => {
    expect(toggleVenueFav('v-1', [])).toEqual(['v-1']);
    expect(toggleVenueFav('v-1', ['v-1'])).toEqual([]);
    expect(isVenueFaved('v-1', ['v-1'])).toBe(true);
  });

  it('云端收藏与本机并集', () => {
    toggleVenueFav('a', []);
    expect(unionVenueFavIds(['b', 'a'])).toEqual(['a', 'b']);
    expect(loadVenueFavIds()).toEqual(['a', 'b']);
  });
});
