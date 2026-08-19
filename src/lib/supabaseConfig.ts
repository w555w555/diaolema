const URL_STORE = 'diaolema.supabase.url.v1';

export function stripEnvValue(raw: string): string {
  const trimmed = raw.trim();
  const wrapped = trimmed.match(/^(['"])(.*)\1$/);
  return (wrapped ? wrapped[2] : trimmed).trim();
}

export function normalizeSupabaseUrl(raw: string): string {
  return stripEnvValue(raw).replace(/\/+$/, '');
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
  const fromEnv = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
  return {
    url: isSupabaseProjectUrl(fromEnv) ? fromEnv : readStoredSupabaseUrl(),
    publishableKey: stripEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''),
  };
}

export function supabaseConfigStatus(): { url: boolean; publishableKey: boolean; urlFromEnv: boolean } {
  const fromEnv = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
  const { url, publishableKey } = readSupabaseConfig();
  return {
    url: Boolean(url),
    publishableKey: Boolean(publishableKey),
    urlFromEnv: isSupabaseProjectUrl(fromEnv),
  };
}

export function isSupabaseConfigured(): boolean {
  const status = supabaseConfigStatus();
  return status.url && status.publishableKey;
}
