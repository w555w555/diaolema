import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, DEMO_FANS, fanCount, loadProfile, normalizeProfile, saveProfile } from './meProfile';

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

describe('normalizeProfile', () => {
  it('空字段回落到默认沪上钓友', () => {
    expect(normalizeProfile({ name: '  ', city: '', bio: '' })).toEqual(DEFAULT_PROFILE);
    expect(normalizeProfile({ name: '阿周', city: '浦东', bio: '路亚' })).toEqual({
      name: '阿周',
      city: '浦东',
      bio: '路亚',
      avatarUrl: '',
    });
  });
});

describe('saveProfile', () => {
  it('写入后能读回', () => {
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
    expect(saveProfile({ name: '青浦老周', bio: '夜钓' })).toMatchObject({
      name: '青浦老周',
      city: '上海',
      bio: '夜钓',
      avatarUrl: '',
    });
    expect(loadProfile().name).toBe('青浦老周');
  });

  it('可保存并清空头像', () => {
    saveProfile({ avatarUrl: 'data:image/jpeg;base64,abc' });
    expect(loadProfile().avatarUrl.startsWith('data:image/')).toBe(true);
    saveProfile({ avatarUrl: '' });
    expect(loadProfile().avatarUrl).toBe('');
  });

  it('保留云端 HTTPS 头像', () => {
    saveProfile({ avatarUrl: 'https://abc.supabase.co/storage/v1/object/public/yj-media/u/avatar/avatar.jpg' });
    expect(loadProfile().avatarUrl).toMatch(/^https:\/\//);
  });
});

describe('fanCount', () => {
  it('示例粉丝人数等于名单长度', () => {
    expect(fanCount()).toBe(DEMO_FANS.length);
    expect(fanCount()).toBeGreaterThan(0);
  });
});
