import { getSupabase } from './supabase';
import { stripInlineImage } from './photo';
import type { CatchReport, GearReview, SpotReview } from '../types';
import type { MeProfile } from './meProfile';

async function authed() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return { supabase, user };
}

export async function pushProfile(profile: MeProfile): Promise<void> {
  const ctx = await authed();
  if (!ctx) return;
  const { error } = await ctx.supabase.from('profiles').upsert({
    user_id: ctx.user.id,
    name: profile.name,
    city: profile.city,
    bio: profile.bio,
    avatar_url: profile.avatarUrl || '',
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function pullProfile(): Promise<Partial<MeProfile> | null> {
  const ctx = await authed();
  if (!ctx) return null;
  const { data, error } = await ctx.supabase.from('profiles').select('name, city, bio, avatar_url').eq('user_id', ctx.user.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    name: data.name ?? undefined,
    city: data.city ?? undefined,
    bio: data.bio ?? undefined,
    avatarUrl: data.avatar_url ?? '',
  };
}

export function catchToRow(report: CatchReport, userId: string) {
  const packed = stripInlineImage(report);
  return {
    client_id: packed.id,
    user_id: userId,
    author: packed.author,
    fish: packed.fish,
    spot_name: packed.spotName,
    lon: packed.lon,
    lat: packed.lat,
    note: packed.note ?? null,
    title: packed.title ?? null,
    source: packed.source,
    caught_at: packed.caughtAt,
  };
}

export async function pushCatch(report: CatchReport): Promise<void> {
  if (report.source !== 'user') return;
  const ctx = await authed();
  if (!ctx) return;
  const { error } = await ctx.supabase.from('catch_reports').upsert(catchToRow(report, ctx.user.id), { onConflict: 'client_id' });
  if (error) throw error;
}

export async function pullCatches(): Promise<CatchReport[]> {
  const ctx = await authed();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from('catch_reports')
    .select('client_id, author, fish, spot_name, lon, lat, note, title, source, caught_at')
    .eq('user_id', ctx.user.id)
    .order('caught_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.client_id),
    author: String(row.author),
    fish: String(row.fish),
    spotName: String(row.spot_name),
    lon: Number(row.lon),
    lat: Number(row.lat),
    note: row.note ? String(row.note) : undefined,
    title: row.title ? String(row.title) : undefined,
    source: (row.source as CatchReport['source']) || 'user',
    caughtAt: String(row.caught_at),
  }));
}

export async function pushLike(reportId: string, liked: boolean): Promise<void> {
  const ctx = await authed();
  if (!ctx) return;
  if (liked) {
    const { error } = await ctx.supabase.from('share_likes').upsert({ user_id: ctx.user.id, report_id: reportId });
    if (error) throw error;
    return;
  }
  const { error } = await ctx.supabase.from('share_likes').delete().eq('user_id', ctx.user.id).eq('report_id', reportId);
  if (error) throw error;
}

export async function pushFollow(author: string, following: boolean): Promise<void> {
  const ctx = await authed();
  if (!ctx) return;
  if (following) {
    const { error } = await ctx.supabase.from('share_follows').upsert({ user_id: ctx.user.id, author_name: author });
    if (error) throw error;
    return;
  }
  const { error } = await ctx.supabase.from('share_follows').delete().eq('user_id', ctx.user.id).eq('author_name', author);
  if (error) throw error;
}

export async function pushWish(productId: string, wished: boolean): Promise<void> {
  const ctx = await authed();
  if (!ctx) return;
  if (wished) {
    const { error } = await ctx.supabase.from('wish_items').upsert({ user_id: ctx.user.id, product_id: productId });
    if (error) throw error;
    return;
  }
  const { error } = await ctx.supabase.from('wish_items').delete().eq('user_id', ctx.user.id).eq('product_id', productId);
  if (error) throw error;
}

export async function pushGearReview(review: GearReview): Promise<void> {
  if (review.source !== 'user') return;
  const ctx = await authed();
  if (!ctx) return;
  const { error } = await ctx.supabase.from('gear_reviews').upsert({
    client_id: review.id,
    user_id: ctx.user.id,
    gear_name: review.gearName,
    author: review.author,
    rating: review.rating,
    body: review.body,
    created_at: review.createdAt,
  }, { onConflict: 'client_id' });
  if (error) throw error;
}

export async function pushSpotReview(review: SpotReview): Promise<void> {
  if (review.source !== 'user') return;
  const ctx = await authed();
  if (!ctx) return;
  const packed = stripInlineImage(review);
  const { error } = await ctx.supabase.from('spot_reviews').upsert({
    client_id: packed.id,
    user_id: ctx.user.id,
    venue_id: packed.venueId,
    author: packed.author,
    rating: packed.rating,
    body: packed.body,
    created_at: packed.createdAt,
  }, { onConflict: 'client_id' });
  if (error) throw error;
}

export function cloudWrite(task: Promise<void>): void {
  void task.catch(() => undefined);
}
