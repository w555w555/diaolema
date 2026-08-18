import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import logoUrl from '../assets/logo.svg?url';
import { formatCatchCaption, formatRelativeTime, sourceLabel } from '../lib/caption';
import {
  canStartDirectMessage,
  DEMO_PEER_ALLOW,
  fetchDmMessages,
  isMutualFollow,
  loadDmAllows,
  mergeChatMessage,
  sendDmMessage,
  setDmAllow,
  pushDmAllow,
} from '../lib/directChat';
import { CHAT_BODY_MAX, chatLoadErrorMessage, draftChatBody } from '../lib/hubChat';
import { HUB_PRODUCTS, loadWishIds } from '../lib/hub';
import { DEMO_FANS, fanCount, fileToAvatarUrl, loadProfile, saveProfile, type MeFan, type MeProfile } from '../lib/meProfile';
import { cloudWrite, pullProfile, pushProfile } from '../lib/userCloud';
import { getShareSocial, subscribeShareSocial } from '../lib/shareSocial';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { CatchReport, HubChatMessage } from '../types';
import { AuthPanel } from './AuthPanel';
import { ShareImport } from './ShareImport';

export type MeStart = 'home' | 'catches' | 'auth';
type MeView = MeStart | 'wish' | 'share' | 'weather' | 'about' | 'edit' | 'fans' | 'follows' | 'dm';

type Props = {
  startView?: MeStart;
  reports: CatchReport[];
  lat: number;
  lon: number;
  onImport: (report: CatchReport) => void;
  onNavigateCatch: (report: CatchReport) => void;
  onOpenDaily: () => void;
  onLocate: () => void;
  onRetryWeather: () => void;
};

const TITLES: Record<MeView, string> = {
  home: '我的',
  catches: '渔获记录',
  wish: '想买清单',
  share: '分享入库',
  weather: '定位与天气',
  about: '关于渔见',
  edit: '编辑资料',
  fans: '粉丝',
  follows: '关注',
  dm: '私聊',
  auth: '登录',
};

export function MeScreen({
  startView = 'home',
  reports,
  lat,
  lon,
  onImport,
  onNavigateCatch,
  onOpenDaily,
  onLocate,
  onRetryWeather,
}: Props) {
  const [view, setView] = useState<MeView>(startView);
  const [profile, setProfile] = useState(loadProfile);
  const [session, setSession] = useState<Session | null>(null);
  const [authTick, setAuthTick] = useState(0);
  const [peer, setPeer] = useState<MeFan | null>(null);
  const [dmAllows, setDmAllows] = useState(loadDmAllows);
  const wishIds = loadWishIds();
  const social = useSyncExternalStore(subscribeShareSocial, getShareSocial);
  const follows = social.follows;
  const fans = DEMO_FANS;
  const wishItems = useMemo(
    () => HUB_PRODUCTS.filter((item) => wishIds.includes(item.id)),
    [wishIds],
  );

  const back = () => {
    if (view === 'dm') {
      setPeer(null);
      setView('fans');
      return;
    }
    setView('home');
  };

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSession(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) return;
      void pullProfile()
        .then((cloud) => {
          if (cloud) setProfile(saveProfile(cloud));
        })
        .catch(() => undefined);
    });
    return () => data.subscription.unsubscribe();
  }, [authTick]);

  return (
    <div className="page-scroll me-page">
      {view === 'home' ? (
        <MeHome
          profile={profile}
          email={session?.user?.email ?? null}
          catchCount={reports.length}
          followCount={follows.length}
          fanCount={fanCount(fans)}
          wishCount={wishIds.length}
          onOpen={setView}
        />
      ) : (
        <>
          <header className="me-subhead">
            <button type="button" className="ghost" onClick={back}>
              返回
            </button>
            <h2>{view === 'dm' ? (peer?.name ?? '私聊') : TITLES[view]}</h2>
          </header>
          {view === 'catches' ? <CatchList reports={reports} onNavigate={onNavigateCatch} /> : null}
          {view === 'wish' ? <WishList items={wishItems} /> : null}
          {view === 'share' ? <ShareImport lat={lat} lon={lon} onImport={onImport} /> : null}
          {view === 'weather' ? (
            <WeatherTools onLocate={onLocate} onRetry={onRetryWeather} />
          ) : null}
          {view === 'fans' ? (
            <FanList
              people={fans}
              follows={follows}
              allows={dmAllows}
              signedIn={Boolean(session?.user)}
              onToggle={(id, allowed) => {
                setDmAllows(setDmAllow(id, allowed));
                cloudWrite(pushDmAllow(id, allowed));
              }}
              onOpenDm={(fan) => {
                setPeer(fan);
                setView('dm');
              }}
              onNeedLogin={() => setView('auth')}
            />
          ) : null}
          {view === 'dm' && peer ? (
            <DirectMessage
              peer={peer}
              signedIn={Boolean(session?.user)}
              onNeedLogin={() => setView('auth')}
            />
          ) : null}
          {view === 'follows' ? (
            <PeopleList
              people={follows.map((name) => ({ id: name, name, city: '上海', note: '已关注' }))}
              empty="还没有关注作者。去首页分享流点关注。"
              sample={false}
            />
          ) : null}
          {view === 'about' ? <AboutYujian /> : null}
          {view === 'auth' ? (
            <AuthPanel
              onSignedIn={back}
              onReady={() => setAuthTick((n) => n + 1)}
            />
          ) : null}
          {view === 'edit' ? (
            <EditProfile
              profile={profile}
              onSave={(next) => {
                setProfile(saveProfile(next));
                cloudWrite(pushProfile(next));
                setView('home');
              }}
            />
          ) : null}
        </>
      )}
      {view === 'home' ? (
        <MeMenus
          signedIn={Boolean(session?.user?.email)}
          catchCount={reports.length}
          wishCount={wishIds.length}
          fanTotal={fanCount(fans)}
          onOpen={setView}
          onOpenDaily={onOpenDaily}
        />
      ) : null}
    </div>
  );
}

function MeHome({
  profile,
  email,
  catchCount,
  followCount,
  fanCount: fansNum,
  wishCount,
  onOpen,
}: {
  profile: MeProfile;
  email: string | null;
  catchCount: number;
  followCount: number;
  fanCount: number;
  wishCount: number;
  onOpen: (view: MeView) => void;
}) {
  return (
    <section className="me-hero">
      <button type="button" className="me-user" onClick={() => onOpen(email ? 'edit' : 'auth')}>
        <img src={profile.avatarUrl || logoUrl} alt="" width={64} height={64} />
        <div>
          <strong>{profile.name}</strong>
          <span>
            {profile.city} · {profile.bio}
          </span>
          <span>{email ? `${email} · 点头像改名字和头像` : '邮箱注册 / 登录'}</span>
        </div>
        <em>{email ? '编辑' : '登录'}</em>
      </button>
      <ul className="me-stats">
        <li>
          <button type="button" onClick={() => onOpen('catches')}>
            <b>{catchCount}</b>
            <span>渔获</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('follows')}>
            <b>{followCount}</b>
            <span>关注</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('fans')}>
            <b>{fansNum}</b>
            <span>粉丝</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('wish')}>
            <b>{wishCount}</b>
            <span>想买</span>
          </button>
        </li>
      </ul>
    </section>
  );
}

function MeMenus({
  signedIn,
  catchCount,
  wishCount,
  fanTotal,
  onOpen,
  onOpenDaily,
}: {
  signedIn: boolean;
  catchCount: number;
  wishCount: number;
  fanTotal: number;
  onOpen: (view: MeView) => void;
  onOpenDaily: () => void;
}) {
  return (
    <>
      <ul className="me-group">
        <li>
          <button type="button" onClick={() => onOpen('auth')}>
            <i data-kind="auth" aria-hidden />
            {signedIn ? '账号 / 退出' : '登录 / 注册'}
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('share')}>
            <i data-kind="share" aria-hidden />
            分享入库
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('catches')}>
            <i data-kind="catch" aria-hidden />
            渔获记录
            <em>{catchCount}</em>
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('fans')}>
            <i data-kind="fans" aria-hidden />
            我的粉丝
            <em>{fanTotal}</em>
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpen('wish')}>
            <i data-kind="wish" aria-hidden />
            想买清单
            <em>{wishCount}</em>
            <span>›</span>
          </button>
        </li>
      </ul>
      <ul className="me-group">
        <li>
          <button type="button" onClick={() => onOpen('weather')}>
            <i data-kind="weather" aria-hidden />
            定位与天气
            <span>›</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={onOpenDaily}>
            <i data-kind="daily" aria-hidden />
            鱼情日报
            <span>›</span>
          </button>
        </li>
      </ul>
      <ul className="me-group">
        <li>
          <button type="button" onClick={() => onOpen('about')}>
            <i data-kind="about" aria-hidden />
            关于渔见
            <span>›</span>
          </button>
        </li>
      </ul>
    </>
  );
}

function FanList({
  people,
  follows,
  allows,
  signedIn,
  onToggle,
  onOpenDm,
  onNeedLogin,
}: {
  people: MeFan[];
  follows: string[];
  allows: Record<string, boolean>;
  signedIn: boolean;
  onToggle: (id: string, allowed: boolean) => void;
  onOpenDm: (fan: MeFan) => void;
  onNeedLogin: () => void;
}) {
  if (!people.length) return <p className="muted">还没有粉丝。</p>;
  return (
    <>
      <p className="muted">
        私聊须互关：先在首页关注同名作者。示例粉丝默认已允许你；你还要打开开关。双方都开后才出现「私聊」。
      </p>
      <ul className="me-people">
        {people.map((row) => {
          const mutual = isMutualFollow(row.name, follows);
          const myAllow = Boolean(allows[row.id]);
          const ready = canStartDirectMessage({ mutual, myAllow, peerAllow: DEMO_PEER_ALLOW });
          return (
            <li key={row.id} className="me-fan-row">
              <i aria-hidden>{row.name.slice(-1)}</i>
              <div>
                <strong>{row.name}</strong>
                <span>
                  {row.city} · {row.note} · 示例
                  {mutual ? ' · 已互关' : ' · 未互关'}
                </span>
              </div>
              <label className="me-dm-switch">
                <input
                  type="checkbox"
                  checked={myAllow}
                  onChange={(ev) => onToggle(row.id, ev.target.checked)}
                />
                允许私聊
              </label>
              {ready ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    if (!signedIn) {
                      onNeedLogin();
                      return;
                    }
                    onOpenDm(row);
                  }}
                >
                  私聊
                </button>
              ) : (
                <em className="me-dm-wait">{mutual ? '等双方打开' : '先去关注'}</em>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DirectMessage({
  peer,
  signedIn,
  onNeedLogin,
}: {
  peer: MeFan;
  signedIn: boolean;
  onNeedLogin: () => void;
}) {
  const cloud = isSupabaseConfigured();
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState<HubChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const nickname = loadProfile().name;

  useEffect(() => {
    if (!cloud || !signedIn) return undefined;
    let cancelled = false;
    setLoadError(null);
    void fetchDmMessages(peer.id)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(chatLoadErrorMessage(err).replace('群聊', '私聊').replace('chat_messages.sql', 'dm.sql'));
      });
    return () => {
      cancelled = true;
    };
  }, [cloud, signedIn, peer.id]);

  if (!cloud) {
    return <p className="muted">配好云端并在 SQL Editor 跑 supabase/dm.sql 后才能私聊。</p>;
  }

  const submit = async () => {
    const body = draftChatBody(draft);
    if (!body) return;
    if (!signedIn) {
      onNeedLogin();
      return;
    }
    setSendError(null);
    setSending(true);
    try {
      const row = await sendDmMessage(peer.id, draft);
      if (row) setRows((current) => mergeChatMessage(current, row));
      setDraft('');
    } catch {
      setSendError('发送失败。若还没建表，请在 SQL Editor 跑 supabase/dm.sql。');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="hub-chat">
      <p className="muted">
        与 {peer.name} 私聊 · 以「{nickname}」发送 · 仅互关且双方允许
      </p>
      {loadError ? <p className="hub-chat-error">{loadError}</p> : null}
      <ul className="hub-chat-log">
        {rows.map((row) => (
          <li key={row.id} data-mine="true">
            <strong>{row.author}</strong>
            <p>{row.body}</p>
            <em>{formatRelativeTime(row.createdAt)}</em>
          </li>
        ))}
      </ul>
      {!loadError && rows.length === 0 ? <p className="muted">还没有私信。示例粉丝不会真人回复。</p> : null}
      <form
        className="hub-chat-form"
        onSubmit={(ev) => {
          ev.preventDefault();
          void submit();
        }}
      >
        <input
          value={draft}
          maxLength={CHAT_BODY_MAX}
          disabled={!signedIn}
          onChange={(ev) => setDraft(ev.target.value)}
          placeholder={signedIn ? '写给对方…' : '登录后才能发言'}
        />
        {signedIn ? (
          <button type="submit" disabled={sending}>
            发送
          </button>
        ) : (
          <button type="button" onClick={onNeedLogin}>
            去登录
          </button>
        )}
      </form>
      {sendError ? <p className="hub-chat-error">{sendError}</p> : null}
    </div>
  );
}

function PeopleList({
  people,
  empty,
  sample = true,
}: {
  people: Pick<MeFan, 'id' | 'name' | 'city' | 'note'>[];
  empty: string;
  sample?: boolean;
}) {
  if (!people.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="me-people">
      {people.map((row) => (
        <li key={row.id}>
          <i aria-hidden>{row.name.slice(-1)}</i>
          <div>
            <strong>{row.name}</strong>
            <span>
              {row.city} · {row.note}
              {sample ? ' · 示例' : ''}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CatchList({
  reports,
  onNavigate,
}: {
  reports: CatchReport[];
  onNavigate: (report: CatchReport) => void;
}) {
  if (!reports.length) return <p className="muted">还没有渔获记录。</p>;
  return (
    <ul className="me-feed">
      {reports.slice(0, 20).map((row) => (
        <li key={row.id}>
          <strong>{formatCatchCaption(row)}</strong>
          <span>
            {sourceLabel(row.source)}
            {row.note ? ` · ${row.note}` : ''}
          </span>
          <button type="button" className="ghost" onClick={() => onNavigate(row)}>
            导航
          </button>
        </li>
      ))}
    </ul>
  );
}

function WishList({ items }: { items: { id: string; name: string; kind: string; priceYuan: number }[] }) {
  if (!items.length) return <p className="muted">还没有想买的装备。去渔圈商城加点。</p>;
  return (
    <ul className="me-feed">
      {items.map((item) => (
        <li key={item.id}>
          <strong>{item.name}</strong>
          <span>
            {item.kind} · ¥{item.priceYuan} · 示例，不可下单
          </span>
        </li>
      ))}
    </ul>
  );
}

function WeatherTools({ onLocate, onRetry }: { onLocate: () => void; onRetry: () => void }) {
  return (
    <div className="me-tools">
      <p className="muted">定位只用来刷新当前点气象，不上传账号。</p>
      <button type="button" onClick={onLocate}>
        定位
      </button>
      <button type="button" className="ghost" onClick={onRetry}>
        重试天气
      </button>
    </div>
  );
}

function AboutYujian() {
  return (
    <article className="me-about">
      <img src={logoUrl} alt="" width={64} height={64} />
      <h3>渔见</h3>
      <p>FISHING INSIGHT</p>
      <span>邮箱注册 / 登录 / 退出</span>
      <p className="muted">天气、渔获与群聊都留在本机。粉丝为示例名单，不接私信。</p>
    </article>
  );
}

function EditProfile({
  profile,
  onSave,
}: {
  profile: MeProfile;
  onSave: (next: MeProfile) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [city, setCity] = useState(profile.city);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  return (
    <form
      className="me-edit"
      onSubmit={(ev) => {
        ev.preventDefault();
        onSave({ name, city, bio, avatarUrl });
      }}
    >
      <label className="me-avatar-pick">
        头像
        <span className="me-avatar-face">
          <img src={avatarUrl || logoUrl} alt="" width={72} height={72} />
          <input
            type="file"
            accept="image/*"
            aria-label="更换头像"
            onChange={(ev) => {
              const file = ev.target.files?.[0];
              ev.target.value = '';
              if (!file) return;
              setAvatarError(null);
              void fileToAvatarUrl(file)
                .then(setAvatarUrl)
                .catch((err: unknown) => setAvatarError(err instanceof Error ? err.message : String(err)));
            }}
          />
        </span>
        <span>点图更换</span>
      </label>
      {avatarUrl ? (
        <button type="button" className="ghost" onClick={() => setAvatarUrl('')}>
          恢复默认头像
        </button>
      ) : null}
      {avatarError ? <p className="me-auth-error">{avatarError}</p> : null}
      <label>
        昵称
        <input value={name} onChange={(ev) => setName(ev.target.value)} maxLength={12} />
      </label>
      <label>
        城市
        <input value={city} onChange={(ev) => setCity(ev.target.value)} maxLength={12} />
      </label>
      <label>
        简介
        <input value={bio} onChange={(ev) => setBio(ev.target.value)} maxLength={20} />
      </label>
      <button type="submit">保存</button>
    </form>
  );
}
