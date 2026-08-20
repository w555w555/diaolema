import { isMyChatMessage } from './chatAvatar';
import { isImageBody } from './chatImage';
import { isStickerBody } from './chatStickers';
import { isVoiceBody } from './chatVoice';
import { isRepostBody, parseRepostBody } from './shareRepost';
import { isVideoBody } from './userMedia';
import { parseQuotedBody } from './chatQuote';
import type { HubChatMessage, HubRoom } from '../types';

const READ_KEY = 'diaolema.chat.read.v1';
const PREVIEW_KEY = 'diaolema.chat.preview.v1';
const listeners = new Set<() => void>();

export type InboxKind = 'room' | 'dm';

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  preview: string;
  at: string;
  unread: number;
  peerId?: string;
};

export type InboxFan = { id: string; name: string };

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function subscribeInbox(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function notifyInbox() {
  listeners.forEach((fn) => fn());
}

export function bumpInbox() {
  notifyInbox();
}

export function loadReads(): Record<string, string> {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(READ_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

export function loadPreviews(): HubChatMessage[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(PREVIEW_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HubChatMessage[];
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row.body === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberPreviews(rows: HubChatMessage[]): HubChatMessage[] {
  const map = new Map(loadPreviews().map((row) => [row.roomId, row]));
  for (const row of rows) {
    const prev = map.get(row.roomId);
    if (!prev || new Date(row.createdAt).getTime() >= new Date(prev.createdAt).getTime()) {
      map.set(row.roomId, row);
    }
  }
  const next = [...map.values()];
  storage()?.setItem(PREVIEW_KEY, JSON.stringify(next));
  notifyInbox();
  return next;
}

export function markThreadRead(threadId: string, at = new Date().toISOString()): Record<string, string> {
  const next = { ...loadReads(), [threadId]: at };
  storage()?.setItem(READ_KEY, JSON.stringify(next));
  notifyInbox();
  return next;
}

export function peerIdFromThread(roomId: string): string | null {
  if (!roomId.startsWith('dm:')) return null;
  const rest = roomId.slice(3);
  const colon = rest.lastIndexOf(':');
  return colon === -1 ? rest : rest.slice(colon + 1);
}

export function isPeerThread(roomId: string, peerId: string): boolean {
  return peerIdFromThread(roomId) === peerId;
}

export function localDmRoomId(peerId: string): string {
  return `dm:${peerId}`;
}

export function peekThreadRead(threadId: string): string | undefined {
  return loadReads()[threadId];
}

export function previewLine(row: HubChatMessage): string {
  const parsed = parseQuotedBody(row.body);
  const inner: HubChatMessage = { ...row, body: parsed.body, replyTo: undefined };
  const text = innerPreview(inner);
  if (row.replyTo || parsed.quote) return `回复 · ${text}`;
  return text;
}

function innerPreview(row: HubChatMessage): string {
  if (isImageBody(row.body) || row.kind === 'image') return '[图片]';
  if (isVideoBody(row.body) || row.kind === 'video') return '[视频]';
  if (isVoiceBody(row.body) || row.kind === 'voice') return '[语音]';
  if (isStickerBody(row.body) || row.kind === 'sticker') return row.body.trim();
  if (isRepostBody(row.body)) {
    const parsed = parseRepostBody(row.body);
    if (parsed?.author && parsed.spotName && parsed.fish) {
      return `转发 · ${parsed.author} 在${parsed.spotName} 钓到${parsed.fish}`;
    }
    return '转发渔获';
  }
  return row.body.trim();
}

export function firstUnreadId(
  rows: HubChatMessage[],
  lastReadAt: string | undefined,
  myUserId: string | null,
  cloud: boolean,
): string | undefined {
  if (!lastReadAt) return undefined;
  const since = new Date(lastReadAt).getTime();
  return rows.find((row) => {
    if (isMyChatMessage(row, myUserId, cloud)) return false;
    const at = new Date(row.createdAt).getTime();
    return Number.isFinite(at) && at > since;
  })?.id;
}

export function searchMessages(rows: HubChatMessage[], query: string): HubChatMessage[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const hay = `${row.author} ${previewLine(row)} ${parseQuotedBody(row.body).body}`.toLowerCase();
    return hay.includes(q);
  });
}

export function searchInbox(rows: InboxItem[], query: string): InboxItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => `${row.title} ${row.preview}`.toLowerCase().includes(q));
}

export function unreadCount(
  rows: HubChatMessage[],
  lastReadAt: string | undefined,
  myUserId: string | null,
  cloud: boolean,
): number {
  const since = lastReadAt ? new Date(lastReadAt).getTime() : 0;
  return rows.filter((row) => {
    if (isMyChatMessage(row, myUserId, cloud)) return false;
    const at = new Date(row.createdAt).getTime();
    return Number.isFinite(at) && at > since;
  }).length;
}

function lastMessage(rows: HubChatMessage[]): HubChatMessage | undefined {
  return rows[rows.length - 1];
}

export function buildInbox(input: {
  rooms: HubRoom[];
  messages: HubChatMessage[];
  fans: InboxFan[];
  reads: Record<string, string>;
  myUserId: string | null;
  cloud: boolean;
}): InboxItem[] {
  const byRoom = new Map<string, HubChatMessage[]>();
  const byPeer = new Map<string, HubChatMessage[]>();
  for (const row of input.messages) {
    const peerId = peerIdFromThread(row.roomId);
    if (peerId) {
      const list = byPeer.get(peerId) ?? [];
      list.push(row);
      byPeer.set(peerId, list);
      continue;
    }
    const list = byRoom.get(row.roomId) ?? [];
    list.push(row);
    byRoom.set(row.roomId, list);
  }
  for (const list of [...byRoom.values(), ...byPeer.values()]) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const rooms: InboxItem[] = input.rooms.map((room) => {
    const rows = byRoom.get(room.id) ?? [];
    const last = lastMessage(rows);
    return {
      id: room.id,
      kind: 'room',
      title: room.name,
      preview: last ? previewLine(last) : room.topic,
      at: last?.createdAt ?? '',
      unread: unreadCount(rows, input.reads[room.id], input.myUserId, input.cloud),
    };
  });

  const fanById = new Map(input.fans.map((fan) => [fan.id, fan.name]));
  const dms: InboxItem[] = [...byPeer.entries()].map(([peerId, rows]) => {
    const last = lastMessage(rows);
    const threadId = localDmRoomId(peerId);
    return {
      id: threadId,
      kind: 'dm' as const,
      title: fanById.get(peerId) || last?.author || '钓友',
      preview: last ? previewLine(last) : '私聊',
      at: last?.createdAt ?? '',
      unread: unreadCount(rows, input.reads[threadId], input.myUserId, input.cloud),
      peerId,
    };
  });

  return [...dms, ...rooms].sort((a, b) => {
    const delta = new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime();
    if (delta) return delta;
    return a.title.localeCompare(b.title, 'zh');
  });
}

export function inboxUnreadTotal(rows: InboxItem[]): number {
  return rows.reduce((sum, row) => sum + row.unread, 0);
}
