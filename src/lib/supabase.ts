import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { applyRuntimeSupabaseConfig, readSupabaseConfig } from './supabaseConfig';

export {
  isSupabaseConfigured,
  readSupabaseConfig,
  supabaseConfigStatus,
} from './supabaseConfig';

let client: SupabaseClient | null | undefined;
let hydratePromise: Promise<void> | null = null;

export function resetSupabaseClient(): void {
  client = undefined;
}

export async function hydrateSupabaseConfig(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const res = await fetch('/api/public-config');
        if (!res.ok) return;
        const data = (await res.json()) as { url?: string; publishableKey?: string };
        applyRuntimeSupabaseConfig(data);
        resetSupabaseClient();
      } catch {
        /* 本机未起预览服务时仍用构建期变量 */
      }
    })();
  }
  await hydratePromise;
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const { url, publishableKey } = readSupabaseConfig();
  if (!url || !publishableKey) {
    client = null;
    return client;
  }
  try {
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    client = null;
  }
  return client;
}
