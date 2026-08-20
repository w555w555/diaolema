import type { HubChatMessage } from '../types';

export type ChatLogItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'unread'; key: string }
  | { type: 'msg'; row: HubChatMessage };

export function chatAvatarLetter(name: string): string {
  const text = name.trim();
  return text ? text.slice(-1) : '钓';
}

export function chatAvatarHue(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function isMyChatMessage(
  row: Pick<HubChatMessage, 'userId' | 'source'>,
  myUserId: string | null,
  cloud: boolean,
): boolean {
  if (cloud) return Boolean(row.userId && myUserId && row.userId === myUserId);
  return row.source === 'user';
}

export function chatDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function chatDayLabel(iso: string, now = new Date()): string {
  const key = chatDayKey(iso);
  if (!key) return '';
  const today = chatDayKey(now.toISOString());
  const yesterday = chatDayKey(new Date(now.getTime() - 86_400_000).toISOString());
  if (key === today) return '今天';
  if (key === yesterday) return '昨天';
  const [year, month, day] = key.split('-');
  if (now.getFullYear() === Number(year)) return `${Number(month)}月${Number(day)}日`;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function withChatDayMarkers(rows: HubChatMessage[], now = new Date()): ChatLogItem[] {
  const items: ChatLogItem[] = [];
  let last = '';
  for (const row of rows) {
    const key = chatDayKey(row.createdAt);
    if (key && key !== last) {
      items.push({ type: 'day', key, label: chatDayLabel(row.createdAt, now) });
      last = key;
    }
    items.push({ type: 'msg', row });
  }
  return items;
}

export function withChatMarkers(rows: HubChatMessage[], now = new Date(), unreadId?: string): ChatLogItem[] {
  const items = withChatDayMarkers(rows, now);
  if (!unreadId) return items;
  const index = items.findIndex((item) => item.type === 'msg' && item.row.id === unreadId);
  if (index < 0) return items;
  return [...items.slice(0, index), { type: 'unread', key: 'unread' }, ...items.slice(index)];
}
