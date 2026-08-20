import { getSupabase } from './supabase';
import { clipChatAuthor, draftChatBody, mapChatRow, mergeChatMessage, type ChatSendExtra } from './hubChat';
import { loadProfile } from './meProfile';
import { clipVoiceDuration, voiceBody } from './chatVoice';
import { IMAGE_BODY } from './chatImage';
import { VIDEO_BODY, cloudMediaUrl } from './userMedia';
import { clipQuotePreview, encodeQuotedBody } from './chatQuote';
import { mergeAllowMap } from './cloudMerge';
import type { HubChatMessage } from '../types';

const ALLOW_KEY = 'diaolema.me.dmAllow.v1';

export const DEMO_PEER_ALLOW = true;

export function isMutualFollow(fanName: string, myFollows: Iterable<string>): boolean {
  return new Set(myFollows).has(fanName);
}

export function canStartDirectMessage(input: { mutual: boolean; myAllow: boolean; peerAllow: boolean }): boolean {
  return input.mutual && input.myAllow && input.peerAllow;
}

export function dmAllowOn(peerKey: string, allows: Record<string, boolean>, sample: boolean): boolean {
  if (Object.prototype.hasOwnProperty.call(allows, peerKey)) return Boolean(allows[peerKey]);
  return sample;
}

export function canOpenFanChat(input: {
  sample: boolean;
  mutual: boolean;
  myAllow: boolean;
  peerAllow: boolean;
  blocked?: boolean;
}): boolean {
  if (input.blocked) return false;
  if (input.sample) return input.myAllow && input.peerAllow;
  return canStartDirectMessage(input);
}

export function dmThreadId(userId: string, peerKey: string): string {
  return `dm:${userId}:${peerKey}`;
}

export function dmThreadIds(userId: string, peerKey: string): string[] {
  const mine = dmThreadId(userId, peerKey);
  const peer = dmThreadId(peerKey, userId);
  return mine === peer ? [mine] : [mine, peer];
}

export function applyDmAllows(remote: Record<string, boolean>): Record<string, boolean> {
  const next = mergeAllowMap(loadDmAllows(), remote);
  storage()?.setItem(ALLOW_KEY, JSON.stringify(next));
  return next;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadDmAllows(): Record<string, boolean> {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(ALLOW_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, Boolean(value)]));
  } catch {
    return {};
  }
}

export function setDmAllow(peerKey: string, allowed: boolean): Record<string, boolean> {
  const next = { ...loadDmAllows(), [peerKey]: allowed };
  storage()?.setItem(ALLOW_KEY, JSON.stringify(next));
  return next;
}

export async function pushDmAllow(peerKey: string, allowed: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return;
  const { error } = await supabase.from('dm_allows').upsert({ user_id: user.id, peer_key: peerKey, allowed });
  if (error) throw error;
}

const DM_SELECT_QUOTE =
  'id, thread_id, sender_id, author, body, created_at, kind, duration_ms, media_url, reply_to_id, reply_author, reply_preview';
const DM_SELECT_FULL = 'id, thread_id, sender_id, author, body, created_at, kind, duration_ms, media_url';
const DM_SELECT_BASIC = 'id, thread_id, sender_id, author, body, created_at';

function mapDmRow(row: unknown): HubChatMessage | null {
  if (!row || typeof row !== 'object') return null;
  const rec = row as Record<string, unknown>;
  return mapChatRow({
    id: rec.id as string,
    room_id: String(rec.thread_id),
    user_id: String(rec.sender_id),
    author: String(rec.author ?? ''),
    body: String(rec.body ?? ''),
    created_at: String(rec.created_at),
    kind: typeof rec.kind === 'string' ? rec.kind : undefined,
    duration_ms: typeof rec.duration_ms === 'number' ? rec.duration_ms : undefined,
    media_url: typeof rec.media_url === 'string' ? rec.media_url : undefined,
    reply_to_id: typeof rec.reply_to_id === 'string' ? rec.reply_to_id : undefined,
    reply_author: typeof rec.reply_author === 'string' ? rec.reply_author : undefined,
    reply_preview: typeof rec.reply_preview === 'string' ? rec.reply_preview : undefined,
  });
}

export async function fetchDmMessages(peerKey: string): Promise<HubChatMessage[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return [];
  const threadIds = dmThreadIds(user.id, peerKey);
  const quote = await supabase
    .from('dm_messages')
    .select(DM_SELECT_QUOTE)
    .in('thread_id', threadIds)
    .order('created_at', { ascending: true })
    .limit(200);
  const full =
    quote.error && /reply_to|column|schema cache/i.test(quote.error.message)
      ? await supabase
          .from('dm_messages')
          .select(DM_SELECT_FULL)
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true })
          .limit(200)
      : quote;
  const result =
    full.error && /kind|duration_ms|media_url|column|schema cache/i.test(full.error.message)
      ? await supabase
          .from('dm_messages')
          .select(DM_SELECT_BASIC)
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true })
          .limit(200)
      : full;
  if (result.error) throw result.error;
  return (result.data ?? [])
    .map((row) => mapDmRow(row))
    .filter((row): row is HubChatMessage => Boolean(row));
}

export async function sendDmMessage(
  peerKey: string,
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
  if (!body) return null;
  const supabase = getSupabase();
  if (!supabase) throw new Error('未配置 Supabase。');
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('请先登录再私聊。');
  const threadId = dmThreadId(user.id, peerKey);
  const payload: Record<string, unknown> = {
    thread_id: threadId,
    sender_id: user.id,
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
  const selectCols = extra?.kind || extra?.replyTo ? DM_SELECT_QUOTE : DM_SELECT_BASIC;
  let data: unknown = null;
  let error: { message: string } | null = null;
  const first = await supabase.from('dm_messages').insert(payload).select(selectCols).single();
  data = first.data;
  error = first.error;
  if (error && extra && /kind|duration_ms|media_url|reply_to|schema cache|column/i.test(error.message)) {
    const fallback = await supabase
      .from('dm_messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        author: clipChatAuthor(loadProfile().name),
        body: extra.replyTo ? encodeQuotedBody(extra.replyTo, body) : body,
      })
      .select(DM_SELECT_BASIC)
      .single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;
  return mapDmRow(data);
}

export function subscribeDmMessages(threadIds: string[], onInsert: (row: HubChatMessage) => void): () => void {
  const supabase = getSupabase();
  const ids = [...new Set(threadIds.filter(Boolean))];
  if (!supabase || !ids.length) return () => undefined;
  const channels = ids.map((threadId) =>
    supabase
      .channel(`dm-chat:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const mapped = mapDmRow(payload.new);
          if (mapped) onInsert(mapped);
        },
      )
      .subscribe(),
  );
  return () => {
    channels.forEach((channel) => {
      void supabase.removeChannel(channel);
    });
  };
}

export { mergeChatMessage };
