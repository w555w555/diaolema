import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { saveChatMedia } from '../lib/chatMedia';
import { IMAGE_BODY } from '../lib/chatImage';
import {
  buildInbox,
  firstUnreadId,
  loadReads,
  localDmRoomId,
  markThreadRead,
  peekThreadRead,
  rememberPreviews,
  searchInbox,
  searchMessages,
  subscribeInbox,
  previewLine,
  type InboxItem,
} from '../lib/chatInbox';
import { dmThreadIds, fetchDmMessages, sendDmMessage, subscribeDmMessages } from '../lib/directChat';
import { formatRelativeTime } from '../lib/caption';
import { chatAvatarHue, chatAvatarLetter } from '../lib/chatAvatar';
import {
  appendChatMessage,
  createGearReview,
  HUB_DISCLAIMER,
  HUB_EVENTS,
  HUB_PRODUCTS,
  HUB_ROOMS,
  HUB_TIPS,
  loadChatMessages,
  loadGearReviews,
  loadWishIds,
  mergeThreadMessages,
  messagesForRoom,
  persistGearReview,
  roomById,
  toggleWish,
} from '../lib/hub';
import {
  chatLoadErrorMessage,
  fetchRoomMessages,
  mergeChatMessage,
  sendRoomMessage,
  subscribeRoomMessages,
} from '../lib/hubChat';
import { voiceBody } from '../lib/chatVoice';
import { prepareChatImage, prepareChatVideo, prepareChatVoice } from '../lib/userMedia';
import { makeQuote } from '../lib/chatQuote';
import { cloudWrite, pushFollow, pushGearReview, pushWish } from '../lib/userCloud';
import { DEMO_FANS, loadProfile, type MeFan } from '../lib/meProfile';
import { getShareSocial, subscribeShareSocial, toggleFollow } from '../lib/shareSocial';
import { getSafety, hideByAuthor, hideInboxFromBlocked, subscribeSafety } from '../lib/userSafety';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { reviewCountLabel } from '../lib/spotScore';
import type { CatchReport, ChatQuote, GearReview, HubChatMessage, HubTip, HubView } from '../types';
import { ChatComposer } from './ChatComposer';
import { ChatLog } from './ChatLog';
import { SafetyActions } from './SafetyActions';
import { SpotStars } from './SpotStars';

const TILES: { view: Exclude<HubView, 'home' | 'chat'>; title: string; short: string }[] = [
  { view: 'mall', title: '装备商城', short: '商城' },
  { view: 'events', title: '赛事', short: '赛事' },
  { view: 'tips', title: '钓鱼技巧', short: '技巧' },
  { view: 'reviews', title: '装备评测', short: '评测' },
  { view: 'community', title: '钓鱼社区', short: '社区' },
];

function eventDate(when: string) {
  const hit = when.match(/(\d+)\s*月\s*(\d+)/);
  return {
    month: hit ? hit[1].padStart(2, '0') : '—',
    day: hit ? hit[2].padStart(2, '0') : '—',
    clock: when.replace(/^.*日\s*/, ''),
  };
}

export function HubScreen({
  reports = [],
  onNeedLogin,
  onOpenAuthor,
  onOpenShare,
}: {
  reports?: CatchReport[];
  onNeedLogin?: () => void;
  onOpenAuthor?: (name: string) => void;
  onOpenShare?: (report: CatchReport) => void;
}) {
  const cloud = isSupabaseConfigured();
  const [view, setView] = useState<HubView>('home');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [dmPeer, setDmPeer] = useState<MeFan | null>(null);
  const [wish, setWish] = useState(loadWishIds);
  const [messages, setMessages] = useState(loadChatMessages);
  const [cloudInbox, setCloudInbox] = useState<HubChatMessage[]>([]);
  const [reviews, setReviews] = useState(loadGearReviews);
  const [tipId, setTipId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const safety = useSyncExternalStore(subscribeSafety, getSafety, getSafety);
  const readStamp = useSyncExternalStore(
    subscribeInbox,
    () => {
      const rows = loadChatMessages();
      return `${JSON.stringify(loadReads())}|${rows.length}|${rows.at(-1)?.id ?? ''}`;
    },
    () => '',
  );

  useEffect(() => {
    setMessages(loadChatMessages());
  }, [readStamp]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSession(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!cloud) return undefined;
    let cancelled = false;
    void Promise.all(HUB_ROOMS.map((room) => fetchRoomMessages(room.id).catch(() => [] as HubChatMessage[]))).then(
      (lists) => {
        if (cancelled) return;
        const flat = lists.flat();
        setCloudInbox(flat);
        rememberPreviews(
          HUB_ROOMS.map((room) => messagesForRoom(room.id, flat).at(-1)).filter((row): row is HubChatMessage => Boolean(row)),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [cloud, view]);

  const inbox = useMemo(() => {
    const seen = new Set<string>();
    const pool: HubChatMessage[] = [];
    for (const row of [...messages, ...cloudInbox]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      pool.push(row);
    }
    return hideInboxFromBlocked(
      buildInbox({
        rooms: HUB_ROOMS,
        messages: hideByAuthor(pool, safety.blocks),
        fans: DEMO_FANS.map((fan) => ({ id: fan.id, name: fan.name })),
        reads: loadReads(),
        myUserId: session?.user?.id ?? null,
        cloud,
      }),
      safety.blocks,
    );
  }, [messages, cloudInbox, session?.user?.id, cloud, readStamp, safety]);

  const openThread = (item: InboxItem) => {
    if (item.kind === 'dm' && item.peerId) {
      setDmPeer(
        DEMO_FANS.find((fan) => fan.id === item.peerId) ?? {
          id: item.peerId,
          name: item.title,
          city: '上海',
          note: '',
        },
      );
    } else {
      setDmPeer(null);
    }
    setRoomId(item.id);
    setView('chat');
  };

  const back = () => {
    if (view === 'chat') {
      setView('community');
      setRoomId(null);
      setDmPeer(null);
      return;
    }
    if (view === 'tips' && tipId) {
      setTipId(null);
      return;
    }
    setView('home');
  };

  const title =
    view === 'home'
      ? '渔圈'
      : view === 'chat'
        ? (dmPeer?.name ?? roomById(roomId ?? '')?.name ?? '聊天')
        : view === 'community'
          ? '消息'
          : TILES.find((row) => row.view === view)?.title ?? '渔圈';

  return (
    <div className={`page-scroll hub-page${view === 'chat' ? ' is-chat' : ''}`}>
      <header className="hub-head">
        {view === 'home' ? (
          <div className="hub-brand">
            <div>
              <h2>渔圈</h2>
              <p>装备 · 赛事 · 社区</p>
            </div>
            <em>{wish.length ? `想买 ${wish.length}` : '示例'}</em>
          </div>
        ) : (
          <div className="hub-head-row">
            <button type="button" className="ghost" onClick={back}>
              返回
            </button>
            <h2>{title}</h2>
          </div>
        )}
      </header>

      {view === 'home' ? (
        <HubHome
          inbox={inbox}
          onOpen={(next) => {
            setTipId(null);
            setView(next);
          }}
          onOpenThread={openThread}
          onOpenTip={(id) => {
            setTipId(id);
            setView('tips');
          }}
        />
      ) : null}
      {view === 'mall' ? (
        <Mall
          wish={wish}
          onWish={(id) => {
            const next = toggleWish(id, wish);
            setWish(next);
            cloudWrite(pushWish(id, next.includes(id)));
          }}
        />
      ) : null}
      {view === 'events' ? <Events /> : null}
      {view === 'tips' ? <Tips tipId={tipId} onOpen={setTipId} /> : null}
      {view === 'reviews' ? (
        <Reviews
          reviews={reviews}
          onSave={(next) => {
            setReviews(next);
            if (next[0]) cloudWrite(pushGearReview(next[0]));
          }}
        />
      ) : null}
      {view === 'community' ? <InboxList rows={inbox} onOpen={openThread} searchable /> : null}
      {view === 'chat' && roomId ? (
        <Chat
          key={roomId}
          roomId={dmPeer ? localDmRoomId(dmPeer.id) : roomId}
          dmPeer={dmPeer}
          cloud={cloud}
          signedIn={Boolean(session?.user)}
          localMessages={messages}
          reports={reports}
          myUserId={session?.user?.id ?? null}
          onLocalSend={(body, extra) =>
            setMessages(appendChatMessage(dmPeer ? localDmRoomId(dmPeer.id) : roomId, body, extra))
          }
          onNeedLogin={onNeedLogin}
          onOpenAuthor={onOpenAuthor}
          onOpenShare={onOpenShare}
        />
      ) : null}
    </div>
  );
}

function gearTone(kind: string) {
  if (kind.includes('竿')) return 'rod';
  if (kind.includes('轮')) return 'reel';
  if (kind.includes('饵')) return 'bait';
  return 'line';
}

function HubIcon({ kind }: { kind: (typeof TILES)[number]['view'] }) {
  if (kind === 'mall') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M7 8.5V7a5 5 0 0 1 10 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="4.5" y="8.5" width="15" height="11" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.5 12.5h15" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (kind === 'events') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="5" y="6.5" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 10.5h14M9 5v3M15 5v3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'tips') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M8 7h8M8 12h8M8 17h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'reviews') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 5.2 13.7 9h4.1l-3.3 2.5 1.3 4-3.8-2.5-3.8 2.5 1.3-4L6.2 9h4.1L12 5.2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="9" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.8 17c.7-2 2.4-3.1 4.2-3.1 1.2 0 2.2.4 3 .1.8.9 1.9 1.4 3.2 1.4 1.7 0 3.3-1 4-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HubHome({
  inbox,
  onOpen,
  onOpenThread,
  onOpenTip,
}: {
  inbox: InboxItem[];
  onOpen: (view: Exclude<HubView, 'home' | 'chat'>) => void;
  onOpenThread: (item: InboxItem) => void;
  onOpenTip: (id: string) => void;
}) {
  const feature = HUB_EVENTS[0];
  const date = feature ? eventDate(feature.when) : null;

  return (
    <>
      <nav className="hub-nav" aria-label="渔圈入口">
        {TILES.map((tile) => (
          <button key={tile.view} type="button" data-kind={tile.view} onClick={() => onOpen(tile.view)}>
            <i aria-hidden>
              <HubIcon kind={tile.view} />
            </i>
            {tile.short}
          </button>
        ))}
      </nav>

      {feature && date ? (
        <section className="hub-block">
          <header className="hub-sec">
            <h3>
              即将开赛<em>{HUB_EVENTS.length}</em>
            </h3>
            <button type="button" className="share-more" onClick={() => onOpen('events')}>
              全部 ›
            </button>
          </header>
          <button type="button" className="hub-feature" onClick={() => onOpen('events')}>
            <time>
              <b>{date.month}</b>
              <strong>{date.day}</strong>
            </time>
            <div>
              <p className="share-kicker">
                {feature.kind} · {date.clock} · 示例
              </p>
              <strong>{feature.title}</strong>
              <span>{feature.place}</span>
            </div>
          </button>
          <ul className="hub-mini">
            {HUB_EVENTS.slice(1, 3).map((item) => (
              <li key={item.id}>
                <button type="button" data-kind={item.kind} onClick={() => onOpen('events')}>
                  <em>{item.kind}</em>
                  <strong>{item.title}</strong>
                  <span>{item.when}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="hub-block">
        <header className="hub-sec">
          <h3>
            热门装备<em>{HUB_PRODUCTS.length}</em>
          </h3>
          <button type="button" className="share-more" onClick={() => onOpen('mall')}>
            商城 ›
          </button>
        </header>
        <ul className="hub-shop">
          {HUB_PRODUCTS.slice(0, 4).map((item) => (
            <li key={item.id}>
              <button type="button" data-tone={gearTone(item.kind)} onClick={() => onOpen('mall')}>
                <span className="hub-swatch" aria-hidden />
                <em>{item.kind}</em>
                <strong>{item.name}</strong>
                <b>¥{item.priceYuan}</b>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="hub-block">
        <header className="hub-sec">
          <h3>
            消息<em>{inbox.reduce((sum, row) => sum + row.unread, 0)}</em>
          </h3>
          <button type="button" className="share-more" onClick={() => onOpen('community')}>
            全部 ›
          </button>
        </header>
        <InboxList rows={inbox} onOpen={onOpenThread} />
      </section>

      <section className="hub-block">
        <header className="hub-sec">
          <h3>技巧精选</h3>
          <button type="button" className="share-more" onClick={() => onOpen('tips')}>
            更多 ›
          </button>
        </header>
        <ul className="hub-tips">
          {HUB_TIPS.slice(0, 2).map((item) => (
            <li key={item.id}>
              <button type="button" data-method={item.method} onClick={() => onOpenTip(item.id)}>
                <em>{item.method}</em>
                <strong>{item.title}</strong>
                <span>{item.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="hub-foot">{HUB_DISCLAIMER}</p>
    </>
  );
}

function Mall({ wish, onWish }: { wish: string[]; onWish: (id: string) => void }) {
  return (
    <ul className="hub-cards is-shop">
      {HUB_PRODUCTS.map((item) => (
        <li key={item.id} className="hub-card" data-tone={gearTone(item.kind)}>
          <p className="share-kicker">
            {item.kind} · {item.tag} · 示例
          </p>
          <strong>{item.name}</strong>
          <span>{item.blurb}</span>
          <span className="hub-price">¥{item.priceYuan}</span>
          <button type="button" className={wish.includes(item.id) ? 'active' : 'ghost'} onClick={() => onWish(item.id)}>
            {wish.includes(item.id) ? '已加入想买' : '加入想买'}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Events() {
  return (
    <ul className="hub-cards is-events">
      {HUB_EVENTS.map((item) => {
        const date = eventDate(item.when);
        return (
          <li key={item.id} className="hub-card hub-event-row">
            <time>
              <b>{date.month}</b>
              <strong>{date.day}</strong>
            </time>
            <div>
              <p className="share-kicker">
                {item.kind} · {date.clock} · 示例
              </p>
              <strong>{item.title}</strong>
              <span>
                {item.place} · {item.blurb}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Tips({ tipId, onOpen }: { tipId: string | null; onOpen: (id: string | null) => void }) {
  const tip = HUB_TIPS.find((row) => row.id === tipId) ?? null;
  if (tip) return <TipDetail tip={tip} />;
  return (
    <ul className="hub-cards">
      {HUB_TIPS.map((item) => (
        <li key={item.id}>
          <button type="button" className="hub-card hub-open" onClick={() => onOpen(item.id)}>
            <p className="share-kicker">{item.method} · 示例</p>
            <strong>{item.title}</strong>
            <span>{item.summary}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TipDetail({ tip }: { tip: HubTip }) {
  return (
    <article className="hub-card">
      <p className="share-kicker">{tip.method} · 示例</p>
      <strong>{tip.title}</strong>
      <p className="hub-article">{tip.body}</p>
    </article>
  );
}

function Reviews({
  reviews,
  onSave,
}: {
  reviews: GearReview[];
  onSave: (next: GearReview[]) => void;
}) {
  const [gearName, setGearName] = useState(HUB_PRODUCTS[0]?.name ?? '');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [body, setBody] = useState('');
  const count = reviews.length;

  return (
    <>
      <p className="muted">{reviewCountLabel(count)}</p>
      <ul className="hub-cards">
        {reviews.map((row) => (
          <li key={row.id} className="hub-card">
            <strong>{row.gearName}</strong>
            <span className="venue-stars">
              <SpotStars score={row.rating} />
              <b className="venue-count">
                {row.author}
                {row.source !== 'user' ? ' · 示例' : ''}
              </b>
            </span>
            <span>{row.body}</span>
            <em className="hub-time">{formatRelativeTime(row.createdAt)}</em>
          </li>
        ))}
      </ul>
      <form
        className="spot-form"
        onSubmit={(ev) => {
          ev.preventDefault();
          onSave(
            persistGearReview(
              createGearReview({
                gearName,
                author: '我',
                rating,
                body: body.trim() || '到场用过，手感还可以。',
              }),
            ),
          );
          setBody('');
        }}
      >
        <h4>我要评测</h4>
        <select value={gearName} onChange={(ev) => setGearName(ev.target.value)}>
          {HUB_PRODUCTS.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="spot-stars" role="radiogroup" aria-label="评分">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button key={n} type="button" data-on={rating >= n ? 'true' : 'false'} onClick={() => setRating(n)}>
              ★
            </button>
          ))}
        </div>
        <textarea value={body} onChange={(ev) => setBody(ev.target.value)} placeholder="手感、抛投、做工……" rows={3} />
        <button type="submit">提交评测</button>
      </form>
    </>
  );
}

function InboxList({
  rows,
  onOpen,
  searchable = false,
}: {
  rows: InboxItem[];
  onOpen: (item: InboxItem) => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState('');
  const visible = searchInbox(rows, query);
  return (
    <>
      {searchable ? (
        <input
          className="hub-chat-search"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder="搜索会话"
        />
      ) : null}
      {searchable && query.trim() && visible.length === 0 ? <p className="muted">没有匹配的会话。</p> : null}
      <ul className="hub-inbox">
        {visible.map((row) => (
        <li key={row.id}>
          <button type="button" onClick={() => onOpen(row)}>
            <i className="hub-chat-avatar" style={{ background: `hsl(${chatAvatarHue(row.title)} 42% 28%)` }} aria-hidden>
              {chatAvatarLetter(row.title)}
            </i>
            <div>
              <strong>
                {row.title}
                {row.kind === 'dm' ? <em>私聊</em> : null}
              </strong>
              <span>{row.preview}</span>
            </div>
            <b>
              {row.at ? formatRelativeTime(row.at) : ''}
              {row.unread > 0 ? <i>{row.unread > 99 ? '99+' : row.unread}</i> : null}
            </b>
          </button>
        </li>
      ))}
    </ul>
    </>
  );
}

function Chat({
  roomId,
  dmPeer,
  cloud,
  signedIn,
  localMessages,
  reports,
  myUserId,
  onLocalSend,
  onNeedLogin,
  onOpenAuthor,
  onOpenShare,
}: {
  roomId: string;
  dmPeer: MeFan | null;
  cloud: boolean;
  signedIn: boolean;
  localMessages: HubChatMessage[];
  reports: CatchReport[];
  myUserId: string | null;
  onLocalSend: (body: string, extra?: Pick<HubChatMessage, 'kind' | 'durationMs' | 'mediaUrl' | 'replyTo'>) => void;
  onNeedLogin?: () => void;
  onOpenAuthor?: (name: string) => void;
  onOpenShare?: (report: CatchReport) => void;
}) {
  const [cloudMessages, setCloudMessages] = useState<HubChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingMention, setPendingMention] = useState('');
  const [quote, setQuote] = useState<ChatQuote | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const openedReadAt = useRef(peekThreadRead(roomId));
  const room = roomById(roomId);
  const nickname = loadProfile().name;
  const myAvatar = loadProfile().avatarUrl;
  const social = useSyncExternalStore(subscribeShareSocial, getShareSocial);
  const [peer, setPeer] = useState<{ name: string; sample: boolean; mine: boolean } | null>(null);
  const isDm = Boolean(dmPeer);
  const cloudRows = useMemo(() => messagesForRoom(roomId, cloudMessages), [roomId, cloudMessages]);
  const localRows = useMemo(() => messagesForRoom(roomId, localMessages), [roomId, localMessages]);
  const rows = useMemo(() => {
    if (!cloud) return localRows;
    if (isDm && !(cloud && signedIn)) return localRows;
    if (cloudRows.length === 0) return localRows;
    return mergeThreadMessages(
      cloudRows,
      localRows.filter((row) => row.source === 'user'),
    );
  }, [cloud, isDm, signedIn, cloudRows, localRows]);
  const unreadId = firstUnreadId(rows, openedReadAt.current, myUserId, cloud);
  const hits = useMemo(() => (seeking ? searchMessages(rows, query) : []), [seeking, rows, query]);
  const canSend = cloud ? signedIn : true;
  const following = peer ? social.follows.includes(peer.name) : false;

  useEffect(() => {
    markThreadRead(roomId);
  }, [roomId]);

  const lastId = rows.at(-1)?.id;
  useEffect(() => {
    const last = rows.at(-1);
    if (last) rememberPreviews([last]);
    // lastId is enough: new array identity must not rewrite previews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  useEffect(() => {
    if (!cloud) return undefined;
    let cancelled = false;
    setLoadError(null);
    setCloudMessages([]);
    const load = isDm && dmPeer
      ? fetchDmMessages(dmPeer.id)
      : fetchRoomMessages(roomId);
    void load
      .then((next) => {
        if (!cancelled) setCloudMessages(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(chatLoadErrorMessage(err).replace('群聊', isDm ? '私聊' : '群聊'));
      });
    const stop =
      isDm && dmPeer && myUserId
        ? subscribeDmMessages(dmThreadIds(myUserId, dmPeer.id), (row) => {
            setCloudMessages((current) => mergeChatMessage(current, row));
          })
        : isDm
          ? () => undefined
          : subscribeRoomMessages(roomId, (row) => {
              setCloudMessages((current) => mergeChatMessage(current, row));
            });
    return () => {
      cancelled = true;
      stop();
    };
  }, [cloud, roomId, isDm, dmPeer, myUserId]);

  const pushOut = async (body: string, extra?: Pick<HubChatMessage, 'kind' | 'durationMs' | 'mediaUrl' | 'replyTo'>) => {
    setSendError(null);
    const packed = { ...extra, replyTo: extra?.replyTo ?? quote ?? undefined };
    if (!cloud) {
      onLocalSend(body, packed);
      setQuote(null);
      return;
    }
    if (!signedIn) {
      onNeedLogin?.();
      return;
    }
    setSending(true);
    try {
      const row = isDm && dmPeer
        ? await sendDmMessage(dmPeer.id, body, packed)
        : await sendRoomMessage(roomId, body, packed);
      if (row) {
        const next = packed.mediaUrl || packed.replyTo
          ? { ...row, mediaUrl: packed.mediaUrl ?? row.mediaUrl, kind: packed.kind ?? row.kind, replyTo: packed.replyTo ?? row.replyTo }
          : row;
        if (packed.mediaUrl?.startsWith('data:')) saveChatMedia(next.id, packed.mediaUrl);
        setCloudMessages((current) => mergeChatMessage(current, next));
        rememberPreviews([{ ...next, roomId }]);
        setQuote(null);
      }
    } catch {
      setSendError('发送失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="hub-chat">
      <p className="muted">
        {isDm ? `与 ${dmPeer?.name} 私聊` : room?.topic}
        {cloud ? ` · 以「${nickname}」发送 · ${isDm ? '私聊' : '公网群聊'}` : ` · 以「${nickname}」发送 · 消息只留在本机`}
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
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightId(row.id);
                      }}
                    >
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
        cloud={cloud}
        unreadId={unreadId}
        highlightId={highlightId}
        onAvatar={(row, mine) => setPeer({ name: row.author, sample: row.source !== 'user', mine })}
        onFollow={(name) => {
          const next = toggleFollow(name);
          cloudWrite(pushFollow(name, next.follows.includes(name)));
        }}
        onMention={(name) => setPendingMention(`@${name} `)}
        onReply={(row) => setQuote(makeQuote(row))}
        onOpenShare={onOpenShare}
      />
      {cloud && !loadError && rows.length === 0 ? <p className="muted">还没有口讯。</p> : null}
      {peer ? (
        <div className="hub-member" role="presentation" onClick={() => setPeer(null)}>
          <div
            className="hub-member-card"
            role="dialog"
            aria-label={`${peer.name}的名片`}
            onClick={(ev) => ev.stopPropagation()}
          >
            <i className="hub-chat-avatar" style={{ background: `hsl(${chatAvatarHue(peer.name)} 42% 28%)` }} aria-hidden>
              {peer.mine && myAvatar ? <img src={myAvatar} alt="" /> : chatAvatarLetter(peer.name)}
            </i>
            <strong>{peer.name}</strong>
            <span>{peer.sample ? '示例钓友' : peer.mine ? '我' : '群成员'}</span>
            {!peer.mine ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const next = toggleFollow(peer.name);
                    cloudWrite(pushFollow(peer.name, next.follows.includes(peer.name)));
                  }}
                >
                  {following ? '取消关注' : '关注'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setPendingMention(`@${peer.name} `);
                    setPeer(null);
                  }}
                >
                  @TA
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    onOpenAuthor?.(peer.name);
                    setPeer(null);
                  }}
                >
                  主页
                </button>
                <SafetyActions name={peer.name} />
              </>
            ) : null}
            <button type="button" className="ghost" onClick={() => setPeer(null)}>
              关闭
            </button>
          </div>
        </div>
      ) : null}
      {pendingMention ? <p className="muted">将发送：{pendingMention}…</p> : null}
      <ChatComposer
        canSend={canSend}
        sending={sending}
        placeholder={cloud && !signedIn ? '登录后才能发言' : '说一句口讯…'}
        quote={quote}
        onClearQuote={() => setQuote(null)}
        onNeedLogin={onNeedLogin}
        onSendText={(body) => {
          const text = `${pendingMention}${body}`;
          setPendingMention('');
          return pushOut(text);
        }}
        onSendSticker={(glyph) => pushOut(glyph, { kind: 'sticker' })}
        onSendVoice={async (ms, dataUrl) => {
          try {
            const mediaUrl = await prepareChatVoice(dataUrl);
            await pushOut(voiceBody(ms), { kind: 'voice', durationMs: ms, mediaUrl });
          } catch (err) {
            setSendError(err instanceof Error ? err.message : '语音发送失败');
          }
        }}
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
