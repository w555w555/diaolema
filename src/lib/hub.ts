import raw from '../data/hub.json';
import type {
  GearReview,
  HubChatMessage,
  HubEvent,
  HubProduct,
  HubRoom,
  HubTip,
  SeedGearReview,
  SeedHubChatMessage,
} from '../types';

type HubFile = {
  disclaimer: string;
  products: HubProduct[];
  events: HubEvent[];
  tips: HubTip[];
  reviews: SeedGearReview[];
  rooms: HubRoom[];
  messages: SeedHubChatMessage[];
};

const catalog = raw as HubFile;

export const HUB_DISCLAIMER = catalog.disclaimer;
export const HUB_PRODUCTS = catalog.products;
export const HUB_EVENTS = catalog.events;
export const HUB_TIPS = catalog.tips;
export const HUB_ROOMS = catalog.rooms;

const WISH_KEY = 'diaolema.hub.wish.v1';
const CHAT_KEY = 'diaolema.hub.chat.v1';
const REVIEW_KEY = 'diaolema.hub.gear.v1';

function fromSeedMessages(rows: SeedHubChatMessage[], now = new Date()): HubChatMessage[] {
  return rows.map((row) => ({
    id: row.id,
    roomId: row.roomId,
    author: row.author,
    body: row.body,
    source: row.source,
    createdAt: new Date(now.getTime() - row.hoursAgo * 3600 * 1000).toISOString(),
  }));
}

function fromSeedReviews(rows: SeedGearReview[], now = new Date()): GearReview[] {
  return rows.map((row) => ({
    id: row.id,
    gearName: row.gearName,
    author: row.author,
    rating: row.rating,
    body: row.body,
    source: row.source,
    createdAt: new Date(now.getTime() - row.hoursAgo * 3600 * 1000).toISOString(),
  }));
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const rawValue = store.getItem(key);
    if (!rawValue) return fallback;
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  storage()?.setItem(key, JSON.stringify(value));
}

export function loadWishIds(): string[] {
  const parsed = readJson<string[]>(WISH_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
}

export function toggleWish(productId: string, current = loadWishIds()): string[] {
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  writeJson(WISH_KEY, next);
  return next;
}

export function messagesForRoom(roomId: string, messages: HubChatMessage[]): HubChatMessage[] {
  return messages
    .filter((row) => row.roomId === roomId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function loadChatMessages(): HubChatMessage[] {
  const seeded = fromSeedMessages(catalog.messages);
  const users = readJson<HubChatMessage[]>(CHAT_KEY, []);
  const extra = Array.isArray(users) ? users : [];
  const seen = new Set(extra.map((row) => row.id));
  return [...seeded.filter((row) => !seen.has(row.id)), ...extra];
}

export function createChatMessage(
  input: Omit<HubChatMessage, 'id' | 'createdAt' | 'source' | 'author'> & { author?: string },
): HubChatMessage {
  return {
    id: `chat-${Date.now()}`,
    roomId: input.roomId,
    author: input.author ?? '我',
    body: input.body,
    source: 'user',
    createdAt: new Date().toISOString(),
  };
}

export function persistChatMessage(message: HubChatMessage): HubChatMessage[] {
  const stored = [...readJson<HubChatMessage[]>(CHAT_KEY, []).filter((row) => row.id !== message.id), message];
  writeJson(CHAT_KEY, stored);
  return loadChatMessages();
}

export function appendChatMessage(roomId: string, body: string): HubChatMessage[] {
  const text = body.trim();
  if (!text) return loadChatMessages();
  return persistChatMessage(createChatMessage({ roomId, body: text }));
}

export function loadGearReviews(): GearReview[] {
  const seeded = fromSeedReviews(catalog.reviews);
  const users = readJson<GearReview[]>(REVIEW_KEY, []);
  const extra = Array.isArray(users) ? users : [];
  const seen = new Set(extra.map((row) => row.id));
  return [...extra, ...seeded.filter((row) => !seen.has(row.id))];
}

export function persistGearReview(review: GearReview): GearReview[] {
  const stored = [review, ...readJson<GearReview[]>(REVIEW_KEY, []).filter((row) => row.id !== review.id)];
  writeJson(REVIEW_KEY, stored);
  return loadGearReviews();
}

export function createGearReview(
  input: Omit<GearReview, 'id' | 'createdAt' | 'source'> & { id?: string },
): GearReview {
  return {
    ...input,
    id: input.id ?? `gear-review-${Date.now()}`,
    source: 'user',
    createdAt: new Date().toISOString(),
  };
}

export function roomById(roomId: string): HubRoom | undefined {
  return HUB_ROOMS.find((row) => row.id === roomId);
}
