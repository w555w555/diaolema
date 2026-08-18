import { describe, expect, it } from 'vitest';
import { isSupabaseProjectUrl, normalizeSupabaseUrl } from './supabaseConfig';

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
});
