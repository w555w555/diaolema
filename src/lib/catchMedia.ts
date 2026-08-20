export const CATCH_IMAGE_MAX = 9;
export const CATCH_VIDEO_MAX_MS = 15_000;
export const CATCH_VIDEO_MAX_BYTES = 8 * 1024 * 1024;

export type CatchMediaFields = {
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
};

export type CatchMediaBadge = { kind: 'video' } | { kind: 'album'; count: number };

export function clipCatchImages(urls: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= CATCH_IMAGE_MAX) break;
  }
  return out;
}

export function catchImages(report: CatchMediaFields): string[] {
  return clipCatchImages([report.imageUrl ?? '', ...(report.imageUrls ?? [])]);
}

export function parsePackedImageUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) return clipCatchImages(raw.map((item) => String(item ?? '')));
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return clipCatchImages(parsed.map((item) => String(item ?? '')));
  } catch {
    return [];
  }
  return [];
}

export function catchVideoUrl(report: CatchMediaFields): string | undefined {
  const url = report.videoUrl?.trim();
  return url || undefined;
}

export function catchMediaBadge(report: CatchMediaFields): CatchMediaBadge | null {
  if (catchVideoUrl(report)) return { kind: 'video' };
  const count = catchImages(report).length;
  if (count > 1) return { kind: 'album', count };
  return null;
}

export function catchVideoError(file: { type: string; size: number }, durationMs?: number): string | null {
  if (!file.type.startsWith('video/')) return '请选择视频';
  if (file.size > CATCH_VIDEO_MAX_BYTES) return '视频超过 8 MB';
  if (durationMs != null && durationMs > CATCH_VIDEO_MAX_MS) return '短视频最长 15 秒';
  return null;
}

export function readVideoDurationMs(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const ms = Number.isFinite(video.duration) ? video.duration * 1000 : 0;
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('视频读不出来'));
    };
    video.src = url;
  });
}
