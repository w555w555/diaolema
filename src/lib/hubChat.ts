import { getSupabase } from './supabase';
import { loadProfile } from './meProfile';
import type { HubChatMessage } from '../types';

export const CHAT_ROOM_IDS = ['room-lure', 'room-ji', 'room-gear', 'room-match'] as const;
export const CHAT_BODY_MAX = 200;
export const CHAT_AUTHOR_MAX = 12;
export const CHAT_PAGE_SIZE = 200;

export type ChatRoomId = (typeof CHAT_ROOM_IDS)[number];

export type ChatMessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  author: string;
  body: string;
  created_at: string;
};

export function isChatRoomId(id: string): id is ChatRoomId {
  return (CHAT_ROOM_IDS as readonly string[]).includes(id);
}

export function draftChatBody(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > CHAT_BODY_MAX) return null;
  return text;
}

export function clipChatAuthor(raw: string): string {
  const name = raw.trim().slice(0, CHAT_AUTHOR_MAX);
  return name || '沪上钓友';
}

export function mapChatRow(row: Partial<ChatMessageRow> | null | undefined): HubChatMessage | null {
  if (!row?.id || !row.room_id || typeof row.body !== 'string' || !row.created_at) return null;
  return {
    id: String(row.id),
    roomId: row.room_id,
    author: clipChatAuthor(row.author ?? ''),
    body: row.body,
    createdAt: row.created_at,
    source: 'user',
    userId: row.user_id ? String(row.user_id) : undefined,
  };
}

export function mergeChatMessage(current: HubChatMessage[], next: HubChatMessage): HubChatMessage[] {
  if (current.some((row) => row.id === next.id)) return current;
  return [...current, next];
}

export function chatLoadErrorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  if (/could not find the table|schema cache|does not exist|relation .*chat_messages/i.test(text)) {
    return '后台还没建群聊表。打开 Supabase SQL Editor，跑一遍 supabase/chat_messages.sql。';
  }
  return '群聊加载失败，请稍后再试。';
}

function asRow(value: unknown): ChatMessageRow | null {
  if (!value || typeof value !== 'object') return null;
  return value as ChatMessageRow;
}

export async function fetchRoomMessages(roomId: string): Promise<HubChatMessage[]> {
  if (!isChatRoomId(roomId)) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, user_id, author, body, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(CHAT_PAGE_SIZE);
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapChatRow(row))
    .filter((row): row is HubChatMessage => Boolean(row))
    .reverse();
}

export async function sendRoomMessage(roomId: string, raw: string): Promise<HubChatMessage | null> {
  const body = draftChatBody(raw);
  if (!body || !isChatRoomId(roomId)) return null;
  const supabase = getSupabase();
  if (!supabase) throw new Error('未配置 Supabase。');
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('请先登录再发言。');
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: user.id,
      author: clipChatAuthor(loadProfile().name),
      body,
    })
    .select('id, room_id, user_id, author, body, created_at')
    .single();
  if (error) throw error;
  const mapped = mapChatRow(asRow(data));
  if (!mapped) throw new Error('发送失败');
  return mapped;
}

export function subscribeRoomMessages(roomId: string, onInsert: (row: HubChatMessage) => void): () => void {
  const supabase = getSupabase();
  if (!supabase || !isChatRoomId(roomId)) return () => undefined;
  const channel = supabase
    .channel(`hub-chat:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const mapped = mapChatRow(asRow(payload.new));
        if (mapped) onInsert(mapped);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
