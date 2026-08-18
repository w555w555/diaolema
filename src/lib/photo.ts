export function packedToDataUrl(packed: { imageBase64: string; mime: string }): string {
  return `data:${packed.mime};base64,${packed.imageBase64}`;
}

export function stripInlineImage<T extends { imageUrl?: string }>(row: T): T {
  if (!row.imageUrl?.startsWith('data:')) return row;
  const next = { ...row };
  delete next.imageUrl;
  return next;
}

export async function snapshotVideo(video: HTMLVideoElement): Promise<File> {
  const width = Math.max(1, video.videoWidth);
  const height = Math.max(1, video.videoHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法拍照');
  ctx.drawImage(video, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error('拍照失败'))), 'image/jpeg', 0.86);
  });
  return new File([blob], `catch-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
