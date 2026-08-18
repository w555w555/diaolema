import { describe, expect, it } from 'vitest';
import { mapAuthError, signupNeedsConfirm, validateAuthForm } from './authMessage';

describe('mapAuthError', () => {
  it('maps common supabase auth errors to Chinese', () => {
    expect(mapAuthError('Invalid login credentials')).toBe('邮箱或密码不对。');
    expect(mapAuthError('Email not confirmed')).toBe('先去邮箱点确认链接，再登录。');
    expect(mapAuthError('User already registered')).toBe('这个邮箱已经注册，直接登录。');
    expect(mapAuthError('Password should be at least 6 characters')).toBe('密码至少 6 位。');
  });

  it('keeps unknown messages', () => {
    expect(mapAuthError('weird backend fault')).toBe('weird backend fault');
  });
});

describe('signupNeedsConfirm', () => {
  it('asks for email confirm when signup created a user without session', () => {
    expect(signupNeedsConfirm(true, true)).toMatch(/确认链接/);
    expect(signupNeedsConfirm(false, true)).toBeNull();
  });
});

describe('validateAuthForm', () => {
  it('requires matching passwords when registering', () => {
    expect(
      validateAuthForm({ email: 'a@b.com', password: '123456', confirm: '123456', mode: 'register' }),
    ).toBeNull();
    expect(
      validateAuthForm({ email: 'a@b.com', password: '123456', confirm: '654321', mode: 'register' }),
    ).toBe('两次密码不一致。');
  });
});
