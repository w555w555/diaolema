import { unionNames } from './cloudMerge';

const LIKE_KEY = 'diaolema.share.likes.v1';
const FOLLOW_KEY = 'diaolema.share.follows.v1';
const FAN_KEY = 'diaolema.share.fans.v1';

export const COVER_RATIOS = ['1/1', '5/4', '4/5'] as const;
export type CoverRatio = (typeof COVER_RATIOS)[number];

function hashId(value: string): number {
  let h = 0;
  for (const ch of value) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function seedLikeCount(id: string): number {
  return 6 + (hashId(id) % 48);
}

export function likeCount(id: string, likedIds: Iterable<string>): number {
  return seedLikeCount(id) + (new Set(likedIds).has(id) ? 1 : 0);
}

export function toggleId(id: string, current: Iterable<string>): string[] {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return [...next];
}

export function coverRatio(id: string): CoverRatio {
  return COVER_RATIOS[hashId(id) % COVER_RATIOS.length];
}

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, values: string[]): void {
  localStorage.setItem(key, JSON.stringify(values));
}

export type ShareSocialState = {
  likes: string[];
  follows: string[];
  fans: string[];
};

let state: ShareSocialState = { likes: [], follows: [], fans: [] };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function hydrateShareSocial(): ShareSocialState {
  state = { likes: readList(LIKE_KEY), follows: readList(FOLLOW_KEY), fans: readList(FAN_KEY) };
  emit();
  return state;
}

if (typeof window !== 'undefined') {
  hydrateShareSocial();
}

export function getShareSocial(): ShareSocialState {
  return state;
}

export function subscribeShareSocial(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyLikes(ids: Iterable<string>): ShareSocialState {
  state = { ...state, likes: unionNames(state.likes, ids) };
  writeList(LIKE_KEY, state.likes);
  emit();
  return state;
}

export function applyFollows(names: Iterable<string>): ShareSocialState {
  state = { ...state, follows: unionNames(state.follows, names) };
  writeList(FOLLOW_KEY, state.follows);
  emit();
  return state;
}

export function toggleLike(id: string): ShareSocialState {
  state = { ...state, likes: toggleId(id, state.likes) };
  writeList(LIKE_KEY, state.likes);
  emit();
  return state;
}

export function toggleFollow(author: string): ShareSocialState {
  state = { ...state, follows: toggleId(author, state.follows) };
  writeList(FOLLOW_KEY, state.follows);
  emit();
  return state;
}

export function setFans(names: string[]): ShareSocialState {
  const fans = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  state = { ...state, fans };
  writeList(FAN_KEY, fans);
  emit();
  return state;
}
