import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import logoUrl from '../assets/logo.svg?url';
import { mapAuthError, signupNeedsConfirm, validateAuthForm } from '../lib/authMessage';
import { getSupabase, hydrateSupabaseConfig, isSupabaseConfigured } from '../lib/supabase';

type Mode = 'login' | 'register';

type Props = {
  onSignedIn?: () => void;
  onReady?: () => void;
};

export function AuthPanel({ onSignedIn, onReady }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const ready = isSupabaseConfigured();
  const supabase = ready ? getSupabase() : null;

  useEffect(() => {
    let cancelled = false;
    void hydrateSupabaseConfig().then(() => {
      if (cancelled) return;
      setBooting(false);
      setTick((n) => n + 1);
      onReady?.();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, tick]);

  const run = async (nextMode: Mode) => {
    const client = getSupabase();
    if (!client) {
      setError('注册暂不可用，请稍后刷新再试。');
      return;
    }
    const invalid = validateAuthForm({
      email,
      password,
      confirm,
      mode: nextMode,
    });
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      if (nextMode === 'login') {
        const { error: next } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (next) throw next;
        onSignedIn?.();
        return;
      }
      const { data, error: next } = await client.auth.signUp({ email: email.trim(), password });
      if (next) throw next;
      const confirmHint = signupNeedsConfirm(!data.session, Boolean(data.user));
      if (confirmHint) {
        setHint(confirmHint);
        setMode('login');
      } else onSignedIn?.();
    } catch (e) {
      setError(mapAuthError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  if (booting) {
    return (
      <div className="me-auth">
        <p className="muted">正在连接账号服务…</p>
      </div>
    );
  }

  if (!ready || !supabase) {
    return (
      <div className="me-auth">
        <p className="muted">账号服务未就绪。请确认 Zeabur 已配置 publishable key 并重新部署。</p>
      </div>
    );
  }

  if (session?.user?.email) {
    return (
      <div className="sign-in">
        <img src={logoUrl} alt="" width={56} height={56} />
        <p className="sign-in-kicker">渔见账号</p>
        <h3>已登录</h3>
        <strong>{session.user.email}</strong>
        <p className="muted">可在 Supabase → Authentication → Users 里管理这个账号。</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void getSupabase()?.auth.signOut();
          }}
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <form
      className="sign-in"
      onSubmit={(ev) => {
        ev.preventDefault();
        void run(mode);
      }}
    >
      <img src={logoUrl} alt="" width={56} height={56} />
      <p className="sign-in-kicker">渔见账号</p>
      <h3>{mode === 'login' ? '登录' : '注册'}</h3>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} data-on={mode === 'login'} onClick={() => setMode('login')}>
          登录
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          data-on={mode === 'register'}
          onClick={() => setMode('register')}
        >
          注册
        </button>
      </div>
      <label>
        邮箱
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          required
        />
      </label>
      <label>
        密码
        <input
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          minLength={6}
          required
        />
      </label>
      {mode === 'register' ? (
        <label>
          确认密码
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            minLength={6}
            required
          />
        </label>
      ) : null}
      {error ? <p className="me-auth-error">{error}</p> : null}
      {hint ? <p className="muted">{hint}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? '请稍候' : mode === 'login' ? '登录' : '注册'}
      </button>
    </form>
  );
}
