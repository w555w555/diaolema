import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  applyDmAllows,
  canOpenFanChat,
  canStartDirectMessage,
  dmAllowOn,
  dmThreadId,
  dmThreadIds,
  isMutualFollow,
  loadDmAllows,
  setDmAllow,
} from './directChat';

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

describe('canOpenFanChat', () => {
  it('示例粉丝默认可聊，不必先关注', () => {
    expect(canOpenFanChat({ sample: true, mutual: false, myAllow: true, peerAllow: true })).toBe(true);
    expect(canOpenFanChat({ sample: false, mutual: false, myAllow: true, peerAllow: true })).toBe(false);
  });

  it('已拉黑不可私聊', () => {
    expect(canOpenFanChat({ sample: true, mutual: true, myAllow: true, peerAllow: true, blocked: true })).toBe(false);
  });

  it('非示例关掉允许则不可聊，且不因互关自动打开', () => {
    expect(canOpenFanChat({ sample: false, mutual: true, myAllow: false, peerAllow: true })).toBe(false);
  });
});

describe('dmAllowOn', () => {
  it('示例未改过开关时默认打开', () => {
    expect(dmAllowOn('fan-zhang', {}, true)).toBe(true);
    expect(dmAllowOn('fan-zhang', { 'fan-zhang': false }, true)).toBe(false);
    expect(dmAllowOn('new', {}, false)).toBe(false);
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

describe('dmThreadIds', () => {
  it('同时包含我发起和对方发起的线程', () => {
    expect(dmThreadIds('uid-1', 'uid-2')).toEqual(['dm:uid-1:uid-2', 'dm:uid-2:uid-1']);
  });
});

describe('applyDmAllows', () => {
  it('本机开关不被云端同键覆盖，并补上云端独有键', () => {
    setDmAllow('fan-zhang', true);
    expect(applyDmAllows({ 'fan-zhang': false, 'fan-zhou': false })).toEqual({
      'fan-zhang': true,
      'fan-zhou': false,
    });
  });
});
