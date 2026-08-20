export const IMAGE_BODY = '[图片]';
export const CHAT_IMAGE_MAX_EDGE = 720;
export const CHAT_IMAGE_QUALITY = 0.72;

export function isImageBody(body: string): boolean {
  return body.trim() === IMAGE_BODY;
}

export async function fileToChatImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new Error('请选择图片');
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, CHAT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('无法压缩图片');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('压缩失败'))),
      'image/jpeg',
      CHAT_IMAGE_QUALITY,
    );
  });
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读不出来'));
    reader.readAsDataURL(blob);
  });
}
