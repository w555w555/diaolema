import { getSupabase } from './supabase';
import { catchImages, parsePackedImageUrls } from './catchMedia';
import { stripInlineImage } from './photo';
import { persistUserComments, type ShareComment } from './shareComments';
import { applyFollows, applyLikes } from './shareSocial';
import { persistGearReview, unionWishIds } from './hub';
import { unionVenueFavIds } from './venueFav';
import { persistSpotReview } from './spotReviews';
import { applyBlocks } from './userSafety';
import { applyDmAllows } from './directChat';
import { cloudMediaUrl, dataUrlToBlob, uploadUserMedia } from './userMedia';
import type { CatchReport, GearReview, SpotReview } from '../types';
import type { MeProfile } from './meProfile';

export { mergeAllowMap, unionNames } from './cloudMerge';

type CloudRow = Record<string, unknown>;

function clipRating(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export function mapNameColumn(row: CloudRow | null | undefined, key: string): string | null {
  const value = String(row?.[key] ?? '').trim();
  return value || null;
}

export function mapCommentCloudRow(row: CloudRow | null | undefined): ShareComment | null {
  const id = String(row?.id ?? '').trim();
  const postId = String(row?.report_id ?? '').trim();
  const author = String(row?.author ?? '').trim();
  const body = String(row?.body ?? '').trim();
  const createdAt = String(row?.created_at ?? '').trim();
  if (!id || !postId || !author || !body) return null;
  return { id, postId, author, body, createdAt: createdAt || new Date().toISOString(), source: 'user' };
}

export function mapGearReviewCloudRow(row: CloudRow | null | undefined): GearReview | null {
  const id = String(row?.client_id ?? '').trim();
  const gearName = String(row?.gear_name ?? '').trim();
  const author = String(row?.author ?? '').trim();
  const body = String(row?.body ?? '').trim();
  const rating = clipRating(row?.rating);
  const createdAt = String(row?.created_at ?? '').trim();
  if (!id || !gearName || !author || !body || !rating) return null;
  return { id, gearName, author, body, rating, createdAt: createdAt || new Date().toISOString(), source: 'user' };
}

export function mapSpotReviewCloudRow(row: CloudRow | null | undefined): SpotReview | null {
  const id = String(row?.client_id ?? '').trim();
  const venueId = String(row?.venue_id ?? '').trim();
  const author = String(row?.author ?? '').trim();
  const body = String(row?.body ?? '').trim();
  const rating = clipRating(row?.rating);
  const createdAt = String(row?.created_at ?? '').trim();
  if (!id || !venueId || !author || !body || !rating) return null;
  return { id, venueId, author, body, rating, createdAt: createdAt || new Date().toISOString(), source: 'user' };
}

export function mapDmAllowRow(row: CloudRow | null | undefined): { peerKey: string; allowed: boolean } | null {
  const peerKey = String(row?.peer_key ?? '').trim();
  if (!peerKey) return null;
  return { peerKey, allowed: Boolean(row?.allowed) };
}

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
    avatar_url: cloudMediaUrl(profile.avatarUrl) ?? '',
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
  const row: {
    client_id: string;
    user_id: string;
    author: string;
    fish: string;
    spot_name: string;
    lon: number;
    lat: number;
    note: string | null;
    title: string | null;
    source: CatchReport['source'];
    caught_at: string;
    video_url?: string;
    image_urls?: string;
  } = {
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
  const video = cloudMediaUrl(packed.videoUrl);
  if (video) row.video_url = video;
  const photos = catchImages(packed)
    .map((url) => cloudMediaUrl(url))
    .filter((url): url is string => Boolean(url));
  if (photos.length) row.image_urls = JSON.stringify(photos);
  return row;
}

type CatchCloudRow = {
  client_id?: unknown;
  author?: unknown;
  fish?: unknown;
  spot_name?: unknown;
  lon?: unknown;
  lat?: unknown;
  note?: unknown;
  title?: unknown;
  source?: unknown;
  caught_at?: unknown;
  video_url?: unknown;
  image_urls?: unknown;
};

export function mapCatchCloudRow(row: CatchCloudRow | null | undefined): CatchReport | null {
  if (!row?.client_id || !row.author || !row.fish || !row.spot_name || row.lon == null || row.lat == null || !row.caught_at) {
    return null;
  }
  const photos = parsePackedImageUrls(row.image_urls)
    .map((url) => cloudMediaUrl(url))
    .filter((url): url is string => Boolean(url));
  return {
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
    videoUrl: cloudMediaUrl(typeof row.video_url === 'string' ? row.video_url : undefined),
    imageUrl: photos[0],
    imageUrls: photos.length > 1 ? photos.slice(1) : undefined,
  };
}

const CATCH_SELECT_MEDIA =
  'client_id, author, fish, spot_name, lon, lat, note, title, source, caught_at, video_url, image_urls';
const CATCH_SELECT_FULL = 'client_id, author, fish, spot_name, lon, lat, note, title, source, caught_at, video_url';
const CATCH_SELECT_BASIC = 'client_id, author, fish, spot_name, lon, lat, note, title, source, caught_at';

export async function publishCatchVideo(report: CatchReport): Promise<CatchReport> {
  const url = report.videoUrl;
  if (!url?.startsWith('data:')) return report;
  const supabase = getSupabase();
  if (!supabase) return report;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return report;
  const blob = dataUrlToBlob(url);
  const file = new File([blob], `${report.id}.mp4`, { type: blob.type || 'video/mp4' });
  const uploaded = await uploadUserMedia(file, 'catch', report.id);
  return { ...report, videoUrl: uploaded };
}

export async function publishCatchImages(report: CatchReport): Promise<CatchReport> {
  const urls = catchImages(report);
  if (!urls.some((url) => url.startsWith('data:'))) return report;
  const supabase = getSupabase();
  if (!supabase) return report;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return report;
  const next: string[] = [];
  for (const [index, url] of urls.entries()) {
    const hosted = cloudMediaUrl(url);
    if (hosted) {
      next.push(hosted);
      continue;
    }
    if (!url.startsWith('data:')) {
      next.push(url);
      continue;
    }
    const blob = dataUrlToBlob(url);
    const file = new File([blob], `${report.id}-${index}.jpg`, { type: blob.type || 'image/jpeg' });
    next.push(await uploadUserMedia(file, 'catch', `${report.id}-img${index}`));
  }
  return { ...report, imageUrl: next[0], imageUrls: next.slice(1) };
}

export async function pushCatch(report: CatchReport): Promise<void> {
  if (report.source !== 'user') return;
  const ctx = await authed();
  if (!ctx) return;
  const payload = catchToRow(report, ctx.user.id);
  const first = await ctx.supabase.from('catch_reports').upsert(payload, { onConflict: 'client_id' });
  if (first.error && /image_urls|video_url|column|schema cache/i.test(first.error.message)) {
    const stripped = { ...payload };
    if (/image_urls/i.test(first.error.message)) delete stripped.image_urls;
    if (/video_url/i.test(first.error.message)) delete stripped.video_url;
    const retry = await ctx.supabase.from('catch_reports').upsert(stripped, { onConflict: 'client_id' });
    if (retry.error && retry.error.message !== first.error.message) {
      const basic = { ...stripped };
      delete basic.image_urls;
      delete basic.video_url;
      const last = await ctx.supabase.from('catch_reports').upsert(basic, { onConflict: 'client_id' });
      if (last.error) throw last.error;
      return;
    }
    if (retry.error) throw retry.error;
    return;
  }
  if (first.error) throw first.error;
}

export async function deleteCatch(clientId: string): Promise<void> {
  const ctx = await authed();
  if (!ctx || !clientId.trim()) return;
  const { error } = await ctx.supabase.from('catch_reports').delete().eq('user_id', ctx.user.id).eq('client_id', clientId);
  if (error) throw error;
}

export async function pullCatches(): Promise<CatchReport[]> {
  const ctx = await authed();
  if (!ctx) return [];
  const media = await ctx.supabase
    .from('catch_reports')
    .select(CATCH_SELECT_MEDIA)
    .eq('user_id', ctx.user.id)
    .order('caught_at', { ascending: false });
  const full =
    media.error && /image_urls|column|schema cache/i.test(media.error.message)
      ? await ctx.supabase
          .from('catch_reports')
          .select(CATCH_SELECT_FULL)
          .eq('user_id', ctx.user.id)
          .order('caught_at', { ascending: false })
      : media;
  const result =
    full.error && /video_url|column|schema cache/i.test(full.error.message)
      ? await ctx.supabase
          .from('catch_reports')
          .select(CATCH_SELECT_BASIC)
          .eq('user_id', ctx.user.id)
          .order('caught_at', { ascending: false })
      : full;
  if (result.error) throw result.error;
  return (result.data ?? [])
    .map((row) => mapCatchCloudRow(row))
    .filter((row): row is CatchReport => Boolean(row));
}

export async function pullPublicCatches(): Promise<CatchReport[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const media = await supabase
    .from('catch_reports')
    .select(CATCH_SELECT_MEDIA)
    .order('caught_at', { ascending: false })
    .limit(80);
  const full =
    media.error && /image_urls|column|schema cache/i.test(media.error.message)
      ? await supabase
          .from('catch_reports')
          .select(CATCH_SELECT_FULL)
          .order('caught_at', { ascending: false })
          .limit(80)
      : media;
  const result =
    full.error && /video_url|column|schema cache/i.test(full.error.message)
      ? await supabase
          .from('catch_reports')
          .select(CATCH_SELECT_BASIC)
          .order('caught_at', { ascending: false })
          .limit(80)
      : full;
  if (result.error) throw result.error;
  return (result.data ?? [])
    .map((row) => mapCatchCloudRow(row))
    .filter((row): row is CatchReport => Boolean(row));
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

export async function pushVenueFav(venueId: string, faved: boolean): Promise<void> {
  const ctx = await authed();
  if (!ctx || !venueId.trim()) return;
  if (faved) {
    const { error } = await ctx.supabase.from('venue_favs').upsert({ user_id: ctx.user.id, venue_id: venueId });
    if (error) throw error;
    return;
  }
  const { error } = await ctx.supabase.from('venue_favs').delete().eq('user_id', ctx.user.id).eq('venue_id', venueId);
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

export async function pullFanNames(authorName: string): Promise<string[]> {
  const ctx = await authed();
  if (!ctx || !authorName.trim()) return [];
  const { data, error } = await ctx.supabase.from('share_follows').select('user_id').eq('author_name', authorName.trim());
  if (error || !data?.length) return [];
  const ids = data.map((row) => String(row.user_id));
  const { data: profiles } = await ctx.supabase.from('profiles').select('user_id, name').in('user_id', ids);
  return (profiles ?? []).map((row) => String(row.name ?? '')).filter(Boolean);
}

export async function pushBlock(author: string, blocked: boolean): Promise<void> {
  const ctx = await authed();
  const name = author.trim();
  if (!ctx || !name) return;
  if (blocked) {
    const { error } = await ctx.supabase.from('user_blocks').upsert({ user_id: ctx.user.id, author_name: name });
    if (error) throw error;
    return;
  }
  const { error } = await ctx.supabase.from('user_blocks').delete().eq('user_id', ctx.user.id).eq('author_name', name);
  if (error) throw error;
}

export async function pushReport(author: string, reason: string): Promise<void> {
  const ctx = await authed();
  const name = author.trim();
  if (!ctx || !name) return;
  const { error } = await ctx.supabase.from('user_reports').insert({
    user_id: ctx.user.id,
    author_name: name,
    reason,
  });
  if (error) throw error;
}

export async function pushComment(row: ShareComment): Promise<void> {
  if (row.source !== 'user') return;
  const ctx = await authed();
  if (!ctx) return;
  const { error } = await ctx.supabase.from('share_comments').insert({
    user_id: ctx.user.id,
    report_id: row.postId,
    author: row.author.trim().slice(0, 12),
    body: row.body.trim().slice(0, 120),
  });
  if (error) throw error;
}

async function pullNameColumn(table: string, column: string): Promise<string[]> {
  const ctx = await authed();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase.from(table).select(column).eq('user_id', ctx.user.id);
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row) => mapNameColumn((row ?? {}) as unknown as CloudRow, column))
    .filter((name): name is string => Boolean(name));
}

export async function hydrateLocalFromCloud(): Promise<void> {
  const ctx = await authed();
  if (!ctx) return;
  const { supabase, user } = ctx;
  const quiet = async (task: () => Promise<void>) => {
    try {
      await task();
    } catch {
      /* 表未建或 RLS 拒绝时忽略，本机缓存仍在 */
    }
  };

  await quiet(async () => {
    const likes = await pullNameColumn('share_likes', 'report_id');
    if (likes.length) applyLikes(likes);
  });
  await quiet(async () => {
    const follows = await pullNameColumn('share_follows', 'author_name');
    if (follows.length) applyFollows(follows);
  });
  await quiet(async () => {
    const wishes = await pullNameColumn('wish_items', 'product_id');
    if (wishes.length) unionWishIds(wishes);
  });
  await quiet(async () => {
    const favs = await pullNameColumn('venue_favs', 'venue_id');
    if (favs.length) unionVenueFavIds(favs);
  });
  await quiet(async () => {
    const blocks = await pullNameColumn('user_blocks', 'author_name');
    if (blocks.length) applyBlocks(blocks);
  });
  await quiet(async () => {
    const gear = await supabase.from('gear_reviews').select('client_id, gear_name, author, rating, body, created_at').eq('user_id', user.id);
    if (gear.error) return;
    for (const row of gear.data ?? []) {
      const mapped = mapGearReviewCloudRow(row as unknown as CloudRow);
      if (mapped) persistGearReview(mapped);
    }
  });
  await quiet(async () => {
    const spots = await supabase.from('spot_reviews').select('client_id, venue_id, author, rating, body, created_at').eq('user_id', user.id);
    if (spots.error) return;
    for (const row of spots.data ?? []) {
      const mapped = mapSpotReviewCloudRow(row as unknown as CloudRow);
      if (mapped) persistSpotReview(mapped);
    }
  });
  await quiet(async () => {
    const allows = await supabase.from('dm_allows').select('peer_key, allowed').eq('user_id', user.id);
    if (allows.error) return;
    const remote: Record<string, boolean> = {};
    for (const row of allows.data ?? []) {
      const mapped = mapDmAllowRow(row as unknown as CloudRow);
      if (mapped) remote[mapped.peerKey] = mapped.allowed;
    }
    if (Object.keys(remote).length) applyDmAllows(remote);
  });
  await quiet(async () => {
    const comments = await supabase
      .from('share_comments')
      .select('id, report_id, author, body, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (comments.error) return;
    persistUserComments(
      (comments.data ?? [])
        .map((row) => mapCommentCloudRow(row as unknown as CloudRow))
        .filter((row): row is ShareComment => Boolean(row)),
    );
  });
}

export function cloudWrite(task: Promise<void>): void {
  void task.catch(() => undefined);
}
