import { getSupabase } from './supabase';
import { clipChatAuthor, draftChatBody, mapChatRow, mergeChatMessage } from './hubChat';
import { loadProfile } from './meProfile';
import type { HubChatMessage } from '../types';

const ALLOW_KEY = 'diaolema.me.dmAllow.v1';

export const DEMO_PEER_ALLOW = true;

export function isMutualFollow(fanName: string, myFollows: Iterable<string>): boolean {
  return new Set(myFollows).has(fanName);
}

export function canStartDirectMessage(input: { mutual: boolean; myAllow: boolean; peerAllow: boolean }): boolean {
  return input.mutual && input.myAllow && input.peerAllow;
}

export function dmThreadId(userId: string, peerKey: string): string {
  return `dm:${userId}:${peerKey}`;
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

export async function fetchDmMessages(peerKey: string): Promise<HubChatMessage[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return [];
  const threadId = dmThreadId(user.id, peerKey);
  const { data, error } = await supabase
    .from('dm_messages')
    .select('id, thread_id, sender_id, author, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? [])
    .map((row) =>
      mapChatRow({
        id: row.id,
        room_id: row.thread_id,
        user_id: row.sender_id,
        author: row.author,
        body: row.body,
        created_at: row.created_at,
      }),
    )
    .filter((row): row is HubChatMessage => Boolean(row));
}

export async function sendDmMessage(peerKey: string, raw: string): Promise<HubChatMessage | null> {
  const body = draftChatBody(raw);
  if (!body) return null;
  const supabase = getSupabase();
  if (!supabase) throw new Error('未配置 Supabase。');
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('请先登录再私聊。');
  const threadId = dmThreadId(user.id, peerKey);
  const { data, error } = await supabase
    .from('dm_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      author: clipChatAuthor(loadProfile().name),
      body,
    })
    .select('id, thread_id, sender_id, author, body, created_at')
    .single();
  if (error) throw error;
  return mapChatRow({
    id: data.id,
    room_id: data.thread_id,
    user_id: data.sender_id,
    author: data.author,
    body: data.body,
    created_at: data.created_at,
  });
}

export { mergeChatMessage };
