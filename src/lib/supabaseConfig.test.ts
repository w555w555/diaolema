import { describe, expect, it } from 'vitest';
import {
  isSupabaseProjectUrl,
  normalizeSupabaseUrl,
  publicConfigFromEnv,
  stripEnvValue,
} from './supabaseConfig';

describe('isSupabaseProjectUrl', () => {
  it('accepts hosted project urls', () => {
    expect(isSupabaseProjectUrl('https://abcd.supabase.co')).toBe(true);
    expect(isSupabaseProjectUrl('https://abcd.supabase.co/')).toBe(true);
  });

  it('rejects empty or http urls', () => {
    expect(isSupabaseProjectUrl('')).toBe(false);
    expect(isSupabaseProjectUrl('http://abcd.supabase.co')).toBe(false);
    expect(isSupabaseProjectUrl('https://example.com')).toBe(false);
  });
});

describe('normalizeSupabaseUrl', () => {
  it('strips trailing slash', () => {
    expect(normalizeSupabaseUrl(' https://abcd.supabase.co/ ')).toBe('https://abcd.supabase.co');
  });

  it('strips wrapping quotes from env values', () => {
    expect(stripEnvValue('"https://abcd.supabase.co"')).toBe('https://abcd.supabase.co');
    expect(normalizeSupabaseUrl('"https://abcd.supabase.co/"')).toBe('https://abcd.supabase.co');
  });
});

describe('publicConfigFromEnv', () => {
  it('uses a valid project url and publishable key', () => {
    expect(
      publicConfigFromEnv({
        VITE_SUPABASE_URL: '"https://abcd.supabase.co/"',
        VITE_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_test ',
      }),
    ).toEqual({
      url: 'https://abcd.supabase.co',
      publishableKey: 'sb_publishable_test',
    });
  });

  it('falls back to the default project url and ignores secrets', () => {
    const next = publicConfigFromEnv({
      VITE_SUPABASE_URL: 'not-a-url',
      SUPABASE_SECRET_KEY: 'sb_secret_do_not_leak',
    });
    expect(next.url).toBe('https://hlsmctozqprxakxlovre.supabase.co');
    expect(next.publishableKey).toBe('');
    expect(JSON.stringify(next)).not.toContain('sb_secret');
  });
});
