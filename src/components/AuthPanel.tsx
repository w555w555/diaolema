import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import logoUrl from '../assets/logo.svg?url';
import { mapAuthError, signupNeedsConfirm, validateAuthForm } from '../lib/authMessage';
import { getSupabase, resetSupabaseClient, supabaseConfigStatus } from '../lib/supabase';
import { isSupabaseProjectUrl, saveStoredSupabaseUrl } from '../lib/supabaseConfig';

type Mode = 'login' | 'register';

type Props = {
  onSignedIn?: () => void;
  onReady?: () => void;
};

export function AuthPanel({ onSignedIn, onReady }: Props) {
  const status = supabaseConfigStatus();
  const [mode, setMode] = useState<Mode>('login');
  const [projectUrl, setProjectUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, tick]);

  const bindUrl = () => {
    setError(null);
    try {
      saveStoredSupabaseUrl(projectUrl);
      resetSupabaseClient();
      setTick((n) => n + 1);
      onReady?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const run = async (nextMode: Mode) => {
    const client = getSupabase();
    if (!client) {
      setError('先填项目地址。');
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

  if (!status.publishableKey) {
    return (
      <div className="me-auth">
        <p className="muted">还缺 publishable key，注册/登录不可用。</p>
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
        if (!status.url) {
          bindUrl();
          return;
        }
        void run(mode);
      }}
    >
      <img src={logoUrl} alt="" width={56} height={56} />
      <p className="sign-in-kicker">渔见账号</p>
      <h3>{mode === 'login' ? '登录' : '注册'}</h3>
      {status.url ? (
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
      ) : null}
      {!status.url ? (
        <>
          <label>
            项目地址
            <input
              type="url"
              placeholder="https://xxxx.supabase.co"
              value={projectUrl}
              onChange={(ev) => setProjectUrl(ev.target.value)}
              required
            />
          </label>
          <p className="muted">在 Supabase → Settings → Data API 复制 Project URL。后台打开 Authentication → Providers → Email。</p>
        </>
      ) : null}
      <label>
        邮箱
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          required={status.url}
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
          required={status.url}
        />
      </label>
      {status.url && mode === 'register' ? (
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
      {!status.url ? (
        <button type="submit" disabled={busy || !isSupabaseProjectUrl(projectUrl)}>
          连接项目
        </button>
      ) : (
        <button type="submit" disabled={busy}>
          {busy ? '请稍候' : mode === 'login' ? '登录' : '注册'}
        </button>
      )}
    </form>
  );
}
