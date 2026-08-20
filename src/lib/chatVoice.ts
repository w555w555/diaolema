export const VOICE_MIN_MS = 400;
export const VOICE_MAX_MS = 15_000;

export function clipVoiceDuration(ms: number): number | null {
  if (!Number.isFinite(ms) || ms < VOICE_MIN_MS) return null;
  return Math.min(Math.round(ms), VOICE_MAX_MS);
}

export function voiceBody(durationMs: number): string {
  const clipped = clipVoiceDuration(durationMs) ?? VOICE_MIN_MS;
  const seconds = Math.max(1, Math.round(clipped / 1000));
  return `[语音 ${seconds}″]`;
}

export function parseVoiceDuration(body: string): number | null {
  const hit = body.trim().match(/^\[语音\s+(\d+)″\]$/);
  if (!hit) return null;
  const seconds = Number(hit[1]);
  if (!Number.isFinite(seconds) || seconds < 1) return null;
  return clipVoiceDuration(seconds * 1000);
}

export function isVoiceBody(body: string): boolean {
  return parseVoiceDuration(body) !== null;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('语音读不出来'));
    reader.readAsDataURL(blob);
  });
}
