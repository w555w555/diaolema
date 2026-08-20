import type { CatchReport } from '../types';

export const COMMENT_BODY_MAX = 120;

export type ShareComment = {
  id: string;
  postId: string;
  author: string;
  body: string;
  createdAt: string;
  source: 'seed' | 'user';
};

export function draftCommentBody(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > COMMENT_BODY_MAX) return null;
  return text;
}

export function seedCommentsForPost(postId: string, source: CatchReport['source']): ShareComment[] {
  if (source === 'user') return [];
  const hour = 1 + (postId.length % 5);
  return [
    {
      id: `seed-c-${postId}-1`,
      postId,
      author: '路亚阿周',
      body: '这位置我也蹲过，傍晚更好。',
      createdAt: new Date(Date.now() - hour * 3600 * 1000).toISOString(),
      source: 'seed',
    },
  ];
}

export function mergeComments(current: ShareComment[], next: ShareComment): ShareComment[] {
  if (current.some((row) => row.id === next.id)) return current;
  return [...current, next].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function commentFingerprint(row: Pick<ShareComment, 'postId' | 'author' | 'body'>): string {
  return `${row.postId}\0${row.author}\0${row.body}`;
}

export function mergeCommentLists(local: ShareComment[], remote: ShareComment[]): ShareComment[] {
  const next = [...local];
  const seenId = new Set(local.map((row) => row.id));
  const seenText = new Set(local.map(commentFingerprint));
  for (const row of remote) {
    if (!isComment(row)) continue;
    const finger = commentFingerprint(row);
    if (seenId.has(row.id) || seenText.has(finger)) continue;
    next.push(row);
    seenId.add(row.id);
    seenText.add(finger);
  }
  return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function persistUserComments(rows: ShareComment[]): ShareComment[] {
  const users = rows.filter((row) => row.source === 'user' && isComment(row));
  const stored = mergeCommentLists(
    readAll().filter((row) => row.source !== 'seed'),
    users,
  );
  storage()?.setItem(COMMENT_KEY, JSON.stringify(stored.filter((row) => row.source === 'user')));
  return stored;
}

const COMMENT_KEY = 'diaolema.share.comments.v1';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readAll(): ShareComment[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(COMMENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isComment) : [];
  } catch {
    return [];
  }
}

function isComment(row: unknown): row is ShareComment {
  if (!row || typeof row !== 'object') return false;
  const item = row as ShareComment;
  return Boolean(item.id && item.postId && item.author && item.body && item.createdAt);
}

export function loadComments(postId: string, source: CatchReport['source'] = 'user'): ShareComment[] {
  const seeded = seedCommentsForPost(postId, source);
  const users = readAll().filter((row) => row.postId === postId);
  const seen = new Set(users.map((row) => row.id));
  return [...seeded.filter((row) => !seen.has(row.id)), ...users].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function commentCount(postId: string, source: CatchReport['source'] = 'user'): number {
  return loadComments(postId, source).length;
}

export function addComment(postId: string, body: string, author: string): ShareComment[] {
  const text = draftCommentBody(body);
  if (!text) return loadComments(postId);
  const row: ShareComment = {
    id: `c-${Date.now()}`,
    postId,
    author: author.trim() || '沪上钓友',
    body: text,
    createdAt: new Date().toISOString(),
    source: 'user',
  };
  storage()?.setItem(COMMENT_KEY, JSON.stringify([...readAll().filter((item) => item.id !== row.id), row]));
  return loadComments(postId);
}
