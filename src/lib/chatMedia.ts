const MEDIA_KEY = 'diaolema.chat.media.v1';

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MEDIA_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveChatMedia(id: string, dataUrl: string): void {
  if (!id || !dataUrl.startsWith('data:')) return;
  const next = { ...readMap(), [id]: dataUrl };
  try {
    localStorage.setItem(MEDIA_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function loadChatMedia(id: string): string | undefined {
  const value = readMap()[id];
  return typeof value === 'string' ? value : undefined;
}
