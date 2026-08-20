import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import logoUrl from '../assets/logo.svg?url';
import { formatCatchCaption, sourceLabel } from '../lib/caption';
import { mergeFanList } from '../lib/authorProfile';
import {
  canOpenFanChat,
  DEMO_PEER_ALLOW,
  dmAllowOn,
  dmThreadIds,
  fetchDmMessages,
  isMutualFollow,
  loadDmAllows,
  mergeChatMessage,
  sendDmMessage,
  setDmAllow,
  subscribeDmMessages,
  pushDmAllow,
} from '../lib/directChat';
import { chatLoadErrorMessage } from '../lib/hubChat';
import {
  HUB_PRODUCTS,
  createChatMessage,
  loadChatMessages,
  loadWishIds,
  messagesForRoom,
  persistChatMessage,
} from '../lib/hub';
import { IMAGE_BODY } from '../lib/chatImage';
import { firstUnreadId, localDmRoomId, markThreadRead, peekThreadRead, previewLine, rememberPreviews, searchMessages } from '../lib/chatInbox';
import { DEMO_FANS, fanCount, fileToAvatarUrl, loadProfile, saveProfile, type MeFan, type MeProfile } from '../lib/meProfile';
import { cloudWrite, pullFanNames, pullProfile, pushProfile, pushBlock } from '../lib/userCloud';
import { getShareSocial, setFans, subscribeShareSocial } from '../lib/shareSocial';
import { getSafety, subscribeSafety, unblockAuthor } from '../lib/userSafety';
import { saveChatMedia } from '../lib/chatMedia';
import { voiceBody } from '../lib/chatVoice';
import { prepareChatImage, prepareChatVideo } from '../lib/userMedia';
import { makeQuote } from '../lib/chatQuote';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { CatchReport, ChatQuote, HubChatMessage } from '../types';
import { AuthPanel } from './AuthPanel';
import { ChatComposer } from './ChatComposer';
import { ChatLog } from './ChatLog';
import { ShareImport } from './ShareImport';

export type MeStart = 'home' | 'catches' | 'auth';
type MeView = MeStart | 'wish' | 'share' | 'weather' | 'about' | 'edit' | 'fans' | 'follows' | 'dm' | 'blocked';

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
  onAuthDone?: () => void;
  onOpenAuthor?: (name: string) => void;
  onOpenShare?: (report: CatchReport) => void;
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
  blocked: '已拉黑',
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
  onAuthDone,
  onOpenAuthor,
  onOpenShare,
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
  const fans = mergeFanList(social.fans);
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
    if (startView !== 'auth') return;
    const supabase = getSupabase();
    if (!supabase) {
      setView('auth');
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setView('home');
        onAuthDone?.();
        return;
      }
      setView('auth');
    });
  }, [startView, onAuthDone]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSession(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        void pullFanNames(loadProfile().name)
          .then((names) => setFans(names))
          .catch(() => undefined);
      }
      if (data.session && startView === 'auth') {
        setView('home');
        onAuthDone?.();
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_IN') {
        setView((current) => (current === 'auth' ? 'home' : current));
        onAuthDone?.();
      }
      if (!next) return;
      void pullProfile()
        .then((cloud) => {
          if (cloud) setProfile(saveProfile(cloud));
        })
        .catch(() => undefined);
    });
    return () => data.subscription.unsubscribe();
  }, [authTick, startView, onAuthDone]);

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
              onToggle={(id, allowed) => {
                setDmAllows(setDmAllow(id, allowed));
                cloudWrite(pushDmAllow(id, allowed));
              }}
              onOpenDm={(fan) => {
                setPeer(fan);
                setView('dm');
              }}
              onOpenAuthor={(name) => onOpenAuthor?.(name)}
            />
          ) : null}
          {view === 'dm' && peer ? (
            <DirectMessage
              peer={peer}
              reports={reports}
              signedIn={Boolean(session?.user)}
              myUserId={session?.user?.id ?? null}
              onNeedLogin={() => setView('auth')}
              onOpenShare={onOpenShare}
            />
          ) : null}
          {view === 'follows' ? (
            <PeopleList
              people={follows.map((name) => ({ id: name, name, city: '上海', note: '已关注' }))}
              empty="还没有关注作者。去首页分享流点关注。"
              sample={false}
              onOpen={(name) => onOpenAuthor?.(name)}
            />
          ) : null}
          {view === 'blocked' ? <BlockedList /> : null}
          {view === 'about' ? <AboutYujian /> : null}
          {view === 'auth' ? (
            <AuthPanel
              onSignedIn={() => {
                setView('home');
                onAuthDone?.();
              }}
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
  onOpen,
  onOpenDaily,
}: {
  signedIn: boolean;
  catchCount: number;
  wishCount: number;
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
        <li>
          <button type="button" onClick={() => onOpen('blocked')}>
            <i data-kind="block" aria-hidden />
            已拉黑
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

function BlockedList() {
  const safety = useSyncExternalStore(subscribeSafety, getSafety, getSafety);
  if (!safety.blocks.length) return <p className="muted">还没有拉黑人。</p>;
  return (
    <ul className="me-people">
      {safety.blocks.map((name) => (
        <li key={name} className="me-fan-row">
          <div className="me-fan-hit">
            <i aria-hidden>{name.slice(-1)}</i>
            <div>
              <strong>{name}</strong>
              <span>拉黑后不看渔获、评论和私聊</span>
            </div>
          </div>
          <button
            type="button"
            className="me-dm-btn"
            onClick={() => {
              unblockAuthor(name);
              cloudWrite(pushBlock(name, false));
            }}
          >
            解除
          </button>
        </li>
      ))}
    </ul>
  );
}

function FanList({
  people,
  follows,
  allows,
  onToggle,
  onOpenDm,
  onOpenAuthor,
}: {
  people: MeFan[];
  follows: string[];
  allows: Record<string, boolean>;
  onToggle: (id: string, allowed: boolean) => void;
  onOpenDm: (fan: MeFan) => void;
  onOpenAuthor?: (name: string) => void;
}) {
  const safety = useSyncExternalStore(subscribeSafety, getSafety, getSafety);
  if (!people.length) return <p className="muted">还没有粉丝。</p>;
  return (
    <>
      <p className="muted">点头像进主页。示例粉丝可直接私聊；也可关掉「允许私聊」。</p>
      <ul className="me-people">
        {people.map((row) => {
          const sample = DEMO_FANS.some((item) => item.id === row.id);
          const mutual = isMutualFollow(row.name, follows);
          const myAllow = dmAllowOn(row.id, allows, sample);
          const blocked = safety.blocks.includes(row.name.trim());
          const open = canOpenFanChat({
            sample,
            mutual,
            myAllow,
            peerAllow: DEMO_PEER_ALLOW,
            blocked,
          });
          return (
            <li key={row.id} className="me-fan-row">
              <button type="button" className="me-fan-hit" onClick={() => onOpenAuthor?.(row.name)}>
                <i aria-hidden>{row.name.slice(-1)}</i>
                <div>
                  <strong>{row.name}</strong>
                  <span>
                    {row.city} · {row.note}
                    {sample ? ' · 示例' : ''}
                    {mutual ? ' · 已互关' : ''}
                    {blocked ? ' · 已拉黑' : ''}
                  </span>
                </div>
              </button>
              <div className="me-fan-actions">
                <label className="me-dm-switch">
                  <input
                    type="checkbox"
                    checked={myAllow}
                    onChange={(ev) => onToggle(row.id, ev.target.checked)}
                  />
                  允许
                </label>
                <button
                  type="button"
                  className="me-dm-btn"
                  disabled={!open}
                  onClick={() => {
                    if (!open) return;
                    onOpenDm(row);
                  }}
                >
                  {blocked ? '已拉黑' : open ? '私聊' : '不可聊'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DirectMessage({
  peer,
  reports,
  signedIn,
  myUserId,
  onNeedLogin,
  onOpenShare,
}: {
  peer: MeFan;
  reports: CatchReport[];
  signedIn: boolean;
  myUserId: string | null;
  onNeedLogin: () => void;
  onOpenShare?: (report: CatchReport) => void;
}) {
  const cloud = isSupabaseConfigured();
  const live = cloud && signedIn;
  const [rows, setRows] = useState<HubChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [quote, setQuote] = useState<ChatQuote | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const nickname = loadProfile().name;
  const openedReadAt = useRef(peekThreadRead(localDmRoomId(peer.id)));
  const unreadId = firstUnreadId(rows, openedReadAt.current, myUserId, live);
  const hits = useMemo(() => (seeking ? searchMessages(rows, query) : []), [seeking, rows, query]);

  useEffect(() => {
    openedReadAt.current = peekThreadRead(localDmRoomId(peer.id));
    markThreadRead(localDmRoomId(peer.id));
  }, [peer.id]);

  useEffect(() => {
    if (!live) {
      setRows(messagesForRoom(localDmRoomId(peer.id), loadChatMessages()));
    }
  }, [live, peer.id]);

  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    setLoadError(null);
    void fetchDmMessages(peer.id)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(chatLoadErrorMessage(err).replace('群聊', '私聊').replace('chat_messages.sql', 'dm.sql'));
      });
    const stop = myUserId ? subscribeDmMessages(dmThreadIds(myUserId, peer.id), (row) => {
      setRows((current) => mergeChatMessage(current, row));
    }) : () => undefined;
    return () => {
      cancelled = true;
      stop();
    };
  }, [live, peer.id, myUserId]);

  const pushOut = async (body: string, extra?: Pick<HubChatMessage, 'kind' | 'durationMs' | 'mediaUrl' | 'replyTo'>) => {
    setSendError(null);
    const packed = { ...extra, replyTo: extra?.replyTo ?? quote ?? undefined };
    if (!live) {
      const row = createChatMessage({
        roomId: localDmRoomId(peer.id),
        body,
        author: nickname,
        kind: packed.kind,
        durationMs: packed.durationMs,
        mediaUrl: packed.mediaUrl,
        replyTo: packed.replyTo,
      });
      if (packed.mediaUrl) saveChatMedia(row.id, packed.mediaUrl);
      persistChatMessage(row);
      rememberPreviews([row]);
      setRows((current) => mergeChatMessage(current, row));
      setQuote(null);
      return;
    }
    setSending(true);
    try {
      const row = await sendDmMessage(peer.id, body, packed);
      if (row) {
        const next = packed.mediaUrl || packed.replyTo
          ? { ...row, mediaUrl: packed.mediaUrl ?? row.mediaUrl, kind: packed.kind ?? row.kind, replyTo: packed.replyTo ?? row.replyTo }
          : row;
        if (packed.mediaUrl?.startsWith('data:')) saveChatMedia(next.id, packed.mediaUrl);
        setRows((current) => mergeChatMessage(current, next));
        rememberPreviews([{ ...next, roomId: localDmRoomId(peer.id) }]);
        setQuote(null);
      }
    } catch {
      setSendError('发送失败。若还没建表，请在 SQL Editor 跑 supabase/dm.sql。');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="hub-chat">
      <p className="muted">
        与 {peer.name} 私聊 · 以「{nickname}」发送
        {live ? ' · 仅互关可见' : ' · 本机演示'}
        <button type="button" className="ghost hub-chat-search-toggle" onClick={() => setSeeking((open) => !open)}>
          {seeking ? '关闭搜索' : '搜索'}
        </button>
      </p>
      {seeking ? (
        <div className="hub-chat-seek">
          <input
            className="hub-chat-search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="搜作者或口讯"
          />
          {query.trim() ? (
            hits.length ? (
              <ul className="hub-chat-hits">
                {hits.slice(0, 8).map((row) => (
                  <li key={row.id}>
                    <button type="button" onClick={() => setHighlightId(row.id)}>
                      <strong>{row.author}</strong>
                      <span>{previewLine(row)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">没有匹配的口讯。</p>
            )
          ) : null}
        </div>
      ) : null}
      {loadError ? <p className="hub-chat-error">{loadError}</p> : null}
      <ChatLog
        rows={rows}
        reports={reports}
        myUserId={myUserId}
        cloud={live}
        unreadId={unreadId}
        highlightId={highlightId}
        onAvatar={() => undefined}
        onReply={(row) => setQuote(makeQuote(row))}
        onOpenShare={onOpenShare}
      />
      {rows.length === 0 ? <p className="muted">还没有私信。示例粉丝不会真人回复。</p> : null}
      <ChatComposer
        canSend
        sending={sending}
        placeholder="写给对方…"
        quote={quote}
        onClearQuote={() => setQuote(null)}
        onNeedLogin={onNeedLogin}
        onSendText={(body) => pushOut(body)}
        onSendSticker={(glyph) => pushOut(glyph, { kind: 'sticker' })}
        onSendVoice={(ms, dataUrl) => pushOut(voiceBody(ms), { kind: 'voice', durationMs: ms, mediaUrl: dataUrl })}
        onSendImage={async (dataUrl) => {
          setSending(true);
          try {
            const mediaUrl = await prepareChatImage(dataUrl);
            await pushOut(IMAGE_BODY, { kind: 'image', mediaUrl });
          } catch (err) {
            setSendError(err instanceof Error ? err.message : '图片发送失败');
            setSending(false);
          }
        }}
        onSendVideo={async (file, ms) => {
          setSending(true);
          try {
            const next = await prepareChatVideo(file, ms);
            await pushOut(next.body, { kind: 'video', durationMs: next.durationMs, mediaUrl: next.mediaUrl });
          } catch (err) {
            setSendError(err instanceof Error ? err.message : '视频发送失败');
            setSending(false);
          }
        }}
      />
      {sendError ? <p className="hub-chat-error">{sendError}</p> : null}
    </div>
  );
}

function PeopleList({
  people,
  empty,
  sample = true,
  onOpen,
}: {
  people: Pick<MeFan, 'id' | 'name' | 'city' | 'note'>[];
  empty: string;
  sample?: boolean;
  onOpen?: (name: string) => void;
}) {
  if (!people.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="me-people">
      {people.map((row) => (
        <li key={row.id}>
          <button type="button" className="me-fan-hit" onClick={() => onOpen?.(row.name)}>
            <i aria-hidden>{row.name.slice(-1)}</i>
            <div>
              <strong>{row.name}</strong>
              <span>
                {row.city} · {row.note}
                {sample ? ' · 示例' : ''}
              </span>
            </div>
          </button>
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
