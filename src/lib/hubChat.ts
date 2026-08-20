import { getSupabase } from './supabase';
import { loadProfile } from './meProfile';
import { isStickerBody } from './chatStickers';
import { clipVoiceDuration, isVoiceBody, parseVoiceDuration, voiceBody } from './chatVoice';
import { isImageBody, IMAGE_BODY } from './chatImage';
import { isRepostBody } from './shareRepost';
import { isVideoBody, VIDEO_BODY, cloudMediaUrl } from './userMedia';
import { clipQuotePreview, encodeQuotedBody, parseQuotedBody } from './chatQuote';
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
  kind?: string | null;
  duration_ms?: number | null;
  media_url?: string | null;
  reply_to_id?: string | null;
  reply_author?: string | null;
  reply_preview?: string | null;
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
  const parsed = parseQuotedBody(row.body);
  const body = parsed.body;
  const replyTo = row.reply_to_id
    ? {
        id: String(row.reply_to_id),
        author: clipChatAuthor(row.reply_author ?? ''),
        preview: clipQuotePreview(String(row.reply_preview ?? '')),
      }
    : parsed.quote;
  const kind =
    row.kind === 'voice' ||
    row.kind === 'sticker' ||
    row.kind === 'share' ||
    row.kind === 'image' ||
    row.kind === 'video'
      ? row.kind
      : isVoiceBody(body)
        ? 'voice'
        : isStickerBody(body)
          ? 'sticker'
          : isRepostBody(body)
            ? 'share'
            : isImageBody(body)
              ? 'image'
              : isVideoBody(body)
                ? 'video'
                : 'text';
  return {
    id: String(row.id),
    roomId: row.room_id,
    author: clipChatAuthor(row.author ?? ''),
    body,
    createdAt: row.created_at,
    source: 'user',
    userId: row.user_id ? String(row.user_id) : undefined,
    kind,
    durationMs: row.duration_ms ? Number(row.duration_ms) : parseVoiceDuration(body) ?? undefined,
    mediaUrl: row.media_url ? String(row.media_url) : undefined,
    replyTo,
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

const CHAT_SELECT_QUOTE =
  'id, room_id, user_id, author, body, created_at, kind, duration_ms, media_url, reply_to_id, reply_author, reply_preview';
const CHAT_SELECT_FULL = 'id, room_id, user_id, author, body, created_at, kind, duration_ms, media_url';
const CHAT_SELECT_BASIC = 'id, room_id, user_id, author, body, created_at';

export type ChatSendExtra = Pick<HubChatMessage, 'kind' | 'durationMs' | 'mediaUrl' | 'replyTo'>;

export async function fetchRoomMessages(roomId: string): Promise<HubChatMessage[]> {
  if (!isChatRoomId(roomId)) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const quote = await supabase
    .from('chat_messages')
    .select(CHAT_SELECT_QUOTE)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(CHAT_PAGE_SIZE);
  const full =
    quote.error && /reply_to|column|schema cache/i.test(quote.error.message)
      ? await supabase
          .from('chat_messages')
          .select(CHAT_SELECT_FULL)
          .eq('room_id', roomId)
          .order('created_at', { ascending: false })
          .limit(CHAT_PAGE_SIZE)
      : quote;
  const result =
    full.error && /kind|duration_ms|media_url|column|schema cache/i.test(full.error.message)
      ? await supabase
          .from('chat_messages')
          .select(CHAT_SELECT_BASIC)
          .eq('room_id', roomId)
          .order('created_at', { ascending: false })
          .limit(CHAT_PAGE_SIZE)
      : full;
  if (result.error) throw result.error;
  return (result.data ?? [])
    .map((row) => mapChatRow(asRow(row)))
    .filter((row): row is HubChatMessage => Boolean(row))
    .reverse();
}

export async function sendRoomMessage(
  roomId: string,
  raw: string,
  extra?: ChatSendExtra,
): Promise<HubChatMessage | null> {
  const body =
    extra?.kind === 'voice'
      ? clipVoiceDuration(extra.durationMs ?? 0)
        ? voiceBody(extra.durationMs ?? 0)
        : null
      : extra?.kind === 'image'
        ? IMAGE_BODY
        : extra?.kind === 'video'
          ? VIDEO_BODY
          : draftChatBody(raw);
  if (!body || !isChatRoomId(roomId)) return null;
  const supabase = getSupabase();
  if (!supabase) throw new Error('未配置 Supabase。');
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('请先登录再发言。');
  const payload: Record<string, unknown> = {
    room_id: roomId,
    user_id: user.id,
    author: clipChatAuthor(loadProfile().name),
    body,
  };
  if (extra?.kind) {
    payload.kind = extra.kind;
    if (extra.durationMs) payload.duration_ms = extra.durationMs;
  }
  const media = cloudMediaUrl(extra?.mediaUrl);
  if (media) payload.media_url = media;
  if (extra?.replyTo) {
    payload.reply_to_id = extra.replyTo.id;
    payload.reply_author = clipChatAuthor(extra.replyTo.author);
    payload.reply_preview = clipQuotePreview(extra.replyTo.preview);
  }
  const selectCols = extra?.kind || extra?.replyTo ? CHAT_SELECT_QUOTE : CHAT_SELECT_BASIC;
  let data: unknown = null;
  let error: { message: string } | null = null;
  const first = await supabase.from('chat_messages').insert(payload).select(selectCols).single();
  data = first.data;
  error = first.error;
  if (error && extra && /kind|duration_ms|media_url|reply_to|schema cache|column/i.test(error.message)) {
    const fallback = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        author: clipChatAuthor(loadProfile().name),
        body: extra.replyTo ? encodeQuotedBody(extra.replyTo, body) : body,
      })
      .select('id, room_id, user_id, author, body, created_at')
      .single();
    data = fallback.data;
    error = fallback.error;
  }
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
