export const DEFAULT_SUPABASE_URL = 'https://hlsmctozqprxakxlovre.supabase.co';

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

export function publicConfigFromEnv(env: Record<string, string | undefined>): { url: string; publishableKey: string } {
  const urlRaw = normalizeSupabaseUrl(env.VITE_SUPABASE_URL || env.SUPABASE_URL || '');
  return {
    url: isSupabaseProjectUrl(urlRaw) ? urlRaw : DEFAULT_SUPABASE_URL,
    publishableKey: stripEnvValue(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ''),
  };
}

let runtime: { url: string; publishableKey: string } | null = null;

export function applyRuntimeSupabaseConfig(next: { url?: string; publishableKey?: string } | null): void {
  if (!next) {
    runtime = null;
    return;
  }
  const urlRaw = normalizeSupabaseUrl(next.url ?? '');
  runtime = {
    url: isSupabaseProjectUrl(urlRaw) ? urlRaw : DEFAULT_SUPABASE_URL,
    publishableKey: stripEnvValue(next.publishableKey ?? ''),
  };
}

export function readSupabaseConfig(): { url: string; publishableKey: string } {
  const baked = publicConfigFromEnv({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  return {
    url: runtime?.url || baked.url,
    publishableKey: baked.publishableKey || runtime?.publishableKey || '',
  };
}

export function supabaseConfigStatus(): { url: boolean; publishableKey: boolean; urlFromEnv: boolean } {
  const { url, publishableKey } = readSupabaseConfig();
  const bakedUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
  return {
    url: Boolean(url),
    publishableKey: Boolean(publishableKey),
    urlFromEnv: isSupabaseProjectUrl(bakedUrl),
  };
}

export function isSupabaseConfigured(): boolean {
  const status = supabaseConfigStatus();
  return status.url && status.publishableKey;
}
