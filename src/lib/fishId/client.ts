import type { FishIdResult } from '../../types';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.8;
const MAX_BYTES = 8 * 1024 * 1024;

export async function compressImageFile(file: File): Promise<{ imageBase64: string; mime: string }> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new Error('请选择图片');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('图片超过 8 MB');
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法压缩图片');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('压缩失败'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { imageBase64: btoa(binary), mime: 'image/jpeg' };
}

export async function fetchFishIdStatus(): Promise<{ configured: boolean; agentUrl?: string }> {
  try {
    const res = await fetch('/api/fish-id');
    if (!res.ok) return { configured: false };
    return (await res.json()) as { configured: boolean; agentUrl?: string };
  } catch {
    return { configured: false };
  }
}

export async function identifyFish(imageBase64: string, mime: string, signal?: AbortSignal): Promise<FishIdResult> {
  const res = await fetch('/api/fish-id', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64, mime }),
    signal,
  });
  const data = (await res.json()) as FishIdResult & { error?: string };
  if (res.status === 503 || data.error === 'not_configured') {
    const err = new Error('not_configured');
    err.name = 'FishIdNotConfigured';
    throw err;
  }
  if (!res.ok) {
    throw new Error(data.error || `识别失败 ${res.status}`);
  }
  return data;
}
