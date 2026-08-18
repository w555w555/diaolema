import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './supabaseConfig';

export { isSupabaseConfigured, readSupabaseConfig, supabaseConfigStatus } from './supabaseConfig';

let client: SupabaseClient | null | undefined;

export function resetSupabaseClient(): void {
  client = undefined;
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const { url, publishableKey } = readSupabaseConfig();
  if (!url || !publishableKey) {
    client = null;
    return client;
  }
  client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
