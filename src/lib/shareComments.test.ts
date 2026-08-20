import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  addComment,
  commentCount,
  draftCommentBody,
  loadComments,
  mergeCommentLists,
  mergeComments,
  persistUserComments,
} from './shareComments';

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
afterEach(() => mem.clear());

describe('draftCommentBody', () => {
  it('rejects empty and over 120', () => {
    expect(draftCommentBody('  ')).toBeNull();
    expect(draftCommentBody('好')).toBe('好');
    expect(draftCommentBody('啊'.repeat(121))).toBeNull();
  });
});

describe('loadComments', () => {
  it('seeds one sample comment for non-user posts', () => {
    expect(loadComments('xhs-dishui', 'xiaohongshu').length).toBe(1);
    expect(loadComments('mine-1', 'user')).toEqual([]);
  });

  it('adds a user comment and counts it', () => {
    addComment('mine-1', '漂亮', '阿周');
    expect(commentCount('mine-1', 'user')).toBe(1);
    expect(loadComments('mine-1', 'user')[0]).toMatchObject({ body: '漂亮', author: '阿周', source: 'user' });
  });
});

describe('mergeComments', () => {
  it('dedupes by id', () => {
    const row = loadComments('xhs-dishui', 'xiaohongshu')[0];
    expect(mergeComments([row], row)).toEqual([row]);
  });
});

describe('mergeCommentLists', () => {
  it('按 id 或同一帖同一作者同一正文去重，示例评论仍保留', () => {
    const seed = loadComments('xhs-dishui', 'xiaohongshu')[0];
    const local = {
      id: 'c-local',
      postId: 'mine-1',
      author: '阿周',
      body: '漂亮',
      createdAt: '2026-08-19T12:00:00.000Z',
      source: 'user' as const,
    };
    const remoteSame = { ...local, id: 'uuid-1' };
    const remoteNew = {
      id: 'uuid-2',
      postId: 'mine-1',
      author: '南汇小路',
      body: '来了',
      createdAt: '2026-08-19T13:00:00.000Z',
      source: 'user' as const,
    };
    const merged = mergeCommentLists([seed, local], [remoteSame, remoteNew]);
    expect(merged.some((row) => row.id === seed.id && row.source === 'seed')).toBe(true);
    expect(merged.filter((row) => row.body === '漂亮')).toHaveLength(1);
    expect(merged.some((row) => row.id === 'uuid-2')).toBe(true);
  });
});

describe('persistUserComments', () => {
  it('写入用户评论后 loadComments 能读到，不把示例标成用户', () => {
    persistUserComments([
      {
        id: 'uuid-3',
        postId: 'mine-2',
        author: '阿周',
        body: '岸抛',
        createdAt: '2026-08-19T12:00:00.000Z',
        source: 'user',
      },
    ]);
    expect(loadComments('mine-2', 'user')).toMatchObject([{ id: 'uuid-3', body: '岸抛', source: 'user' }]);
    expect(loadComments('xhs-dishui', 'xiaohongshu')[0].source).toBe('seed');
  });
});
