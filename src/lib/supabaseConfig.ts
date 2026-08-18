const URL_STORE = 'diaolema.supabase.url.v1';

export function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

export function isSupabaseProjectUrl(raw: string): boolean {
  try {
    const url = new URL(normalizeSupabaseUrl(raw));
    if (url.protocol !== 'https:') return false;
    return url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.net');
  } catch {
    return false;
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readStoredSupabaseUrl(): string {
  return storage()?.getItem(URL_STORE)?.trim() || '';
}

export function saveStoredSupabaseUrl(raw: string): string {
  const url = normalizeSupabaseUrl(raw);
  if (!isSupabaseProjectUrl(url)) throw new Error('请填 https://xxxx.supabase.co 这种项目地址。');
  storage()?.setItem(URL_STORE, url);
  return url;
}

export function readSupabaseConfig(): { url: string; publishableKey: string } {
  const fromEnv = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  return {
    url: fromEnv || readStoredSupabaseUrl(),
    publishableKey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
  };
}

export function supabaseConfigStatus(): { url: boolean; publishableKey: boolean; urlFromEnv: boolean } {
  const fromEnv = Boolean((import.meta.env.VITE_SUPABASE_URL ?? '').trim());
  const { url, publishableKey } = readSupabaseConfig();
  return { url: Boolean(url), publishableKey: Boolean(publishableKey), urlFromEnv: fromEnv };
}

export function isSupabaseConfigured(): boolean {
  const status = supabaseConfigStatus();
  return status.url && status.publishableKey;
}
