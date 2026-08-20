import { CATCH_VIDEO_MAX_BYTES, catchVideoError } from './catchMedia';
import { blobToDataUrl } from './chatVoice';
import { getSupabase } from './supabase';
import { readSupabaseConfig } from './supabaseConfig';

export const MEDIA_BUCKET = 'yj-media';
export const VIDEO_BODY = '[视频]';

export function isVideoBody(raw: string): boolean {
  return raw.trim() === VIDEO_BODY;
}

export function extFromMime(mime: string): string {
  const type = mime.toLowerCase();
  if (type.includes('jpeg') || type === 'image/jpg') return 'jpg';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.startsWith('audio/') && type.includes('ogg')) return 'ogg';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.startsWith('audio/') && type.includes('mp4')) return 'm4a';
  if (type.includes('webm')) return 'webm';
  if (type.includes('quicktime')) return 'mov';
  if (type.includes('ogg')) return 'ogv';
  return type.startsWith('audio/') ? 'webm' : 'mp4';
}

export function isImageMime(mime: string): boolean {
  return mime.toLowerCase().startsWith('image/');
}

export function isAudioMime(mime: string): boolean {
  return mime.toLowerCase().startsWith('audio/');
}

export function mediaObjectPath(input: {
  userId: string;
  folder: 'chat' | 'catch' | 'avatar';
  fileId: string;
  ext: string;
}): string {
  const ext = input.ext.replace(/^\./, '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const fileId = input.fileId.replace(/[^a-zA-Z0-9_-]/g, '') || 'file';
  const userId = input.userId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${userId}/${input.folder}/${fileId}.${ext}`;
}

export function publicMediaUrl(supabaseUrl: string, objectPath: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const encoded = objectPath
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`;
}

export function cloudMediaUrl(url: string | undefined | null): string | undefined {
  const text = url?.trim();
  if (!text || !/^https?:\/\//i.test(text)) return undefined;
  return text;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) throw new Error('视频读不出来');
  const mime = match[1] || 'application/octet-stream';
  const binary = match[2]
    ? atob(match[3])
    : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function mediaUploadErrorMessage(err: unknown): string {
  const text =
    err instanceof Error
      ? err.message
      : err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
  if (/Bucket not found|yj-media/i.test(text)) {
    return '后台还没建媒体桶。打开 Supabase SQL Editor，跑一遍 supabase/social.sql。';
  }
  if (/not allowed|row-level|policy|Unauthorized|JWT/i.test(text)) {
    return '请先登录再上传。';
  }
  if (/Payload too large|exceeded|maximum|too large/i.test(text)) {
    return '文件超过 8 MB';
  }
  return text || '上传失败';
}

function asVideoFile(file: File): File {
  if (file.type.startsWith('video/')) return file;
  const name = file.name.toLowerCase();
  const type = name.endsWith('.webm') ? 'video/webm' : name.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
  return new File([file], file.name || `catch.${extFromMime(type)}`, { type });
}

function asImageFile(file: File): File {
  if (isImageMime(file.type)) return file;
  return new File([file], file.name || 'photo.jpg', { type: 'image/jpeg' });
}

export async function uploadUserMedia(file: File, folder: 'chat' | 'catch' | 'avatar', fileId: string): Promise<string> {
  const image = isImageMime(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  const audio = isAudioMime(file.type);
  const payload = image ? asImageFile(file) : file;
  if (!image && !audio) {
    const video = asVideoFile(file);
    const invalid = catchVideoError(video);
    if (invalid) throw new Error(invalid);
    if (video.size > CATCH_VIDEO_MAX_BYTES) throw new Error('视频超过 8 MB');
    return putUserMedia(video, folder, fileId, false);
  }
  if (payload.size > CATCH_VIDEO_MAX_BYTES) throw new Error(image ? '图片超过 8 MB' : '语音超过 8 MB');
  return putUserMedia(payload, folder, fileId, image);
}

async function putUserMedia(payload: File, folder: 'chat' | 'catch' | 'avatar', fileId: string, image: boolean): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('未配置 Supabase。');
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('请先登录再上传。');
  const { url } = readSupabaseConfig();
  const mime = payload.type || (image ? 'image/jpeg' : isAudioMime(payload.type) ? 'audio/webm' : 'video/mp4');
  const path = mediaObjectPath({
    userId: user.id,
    folder,
    fileId,
    ext: extFromMime(mime),
  });
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, payload, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw new Error(mediaUploadErrorMessage(error));
  return publicMediaUrl(url, path);
}

export async function prepareChatImage(dataUrl: string): Promise<string> {
  const hosted = cloudMediaUrl(dataUrl);
  if (hosted) return hosted;
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const supabase = getSupabase();
  if (!supabase) return dataUrl;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error('请先登录再发图片');
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], 'chat.jpg', { type: blob.type || 'image/jpeg' });
  return uploadUserMedia(file, 'chat', crypto.randomUUID());
}

async function prepareDataUrlMedia(dataUrl: string, folder: 'chat' | 'avatar', fileId: string, loginError: string): Promise<string> {
  const hosted = cloudMediaUrl(dataUrl);
  if (hosted) return hosted;
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const supabase = getSupabase();
  if (!supabase) return dataUrl;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    if (folder === 'avatar') return dataUrl;
    throw new Error(loginError);
  }
  const blob = dataUrlToBlob(dataUrl);
  const mime = blob.type || (folder === 'avatar' ? 'image/jpeg' : 'audio/webm');
  const ext = extFromMime(mime);
  const file = new File([blob], `${fileId}.${ext}`, { type: mime });
  return uploadUserMedia(file, folder, fileId);
}

export async function prepareChatVoice(dataUrl: string): Promise<string> {
  return prepareDataUrlMedia(dataUrl, 'chat', crypto.randomUUID(), '请先登录再发语音');
}

export async function prepareAvatar(dataUrl: string): Promise<string> {
  return prepareDataUrlMedia(dataUrl, 'avatar', 'avatar', '请先登录再换头像');
}

export async function prepareChatVideo(
  file: File,
  durationMs: number,
): Promise<{ body: string; durationMs: number; mediaUrl: string }> {
  const video = asVideoFile(file);
  const invalid = catchVideoError(video, durationMs);
  if (invalid) throw new Error(invalid);
  const supabase = getSupabase();
  if (!supabase) {
    return { body: VIDEO_BODY, durationMs, mediaUrl: await blobToDataUrl(video) };
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error('请先登录再发视频');
  const mediaUrl = await uploadUserMedia(video, 'chat', crypto.randomUUID());
  return { body: VIDEO_BODY, durationMs, mediaUrl };
}
