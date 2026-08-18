export function mapAuthError(message: string): string {
  const text = message.trim();
  if (/invalid login credentials/i.test(text)) return '邮箱或密码不对。';
  if (/email not confirmed/i.test(text)) return '先去邮箱点确认链接，再登录。';
  if (/user already registered/i.test(text)) return '这个邮箱已经注册，直接登录。';
  if (/password should be at least/i.test(text)) return '密码至少 6 位。';
  if (/unable to validate email/i.test(text) || /invalid email/i.test(text)) return '邮箱格式不对。';
  if (/signup is disabled/i.test(text)) return '后台关闭了注册，只能登录已有账号。';
  if (/rate limit|too many requests/i.test(text)) return '试得太勤，稍后再试。';
  if (!text) return '登录失败，请再试一次。';
  return text;
}

export function signupNeedsConfirm(sessionMissing: boolean, userCreated: boolean): string | null {
  if (userCreated && sessionMissing) return '注册成功。去邮箱点确认链接后再登录。';
  return null;
}

export function validateAuthForm(input: {
  email: string;
  password: string;
  confirm?: string;
  mode: 'login' | 'register';
}): string | null {
  if (!input.email.trim() || !input.email.includes('@')) return '请填写邮箱。';
  if (input.password.length < 6) return '密码至少 6 位。';
  if (input.mode === 'register' && input.password !== (input.confirm ?? '')) return '两次密码不一致。';
  return null;
}

