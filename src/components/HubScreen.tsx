import { useMemo, useState } from 'react';
import { formatRelativeTime } from '../lib/caption';
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
  messagesForRoom,
  persistGearReview,
  roomById,
  toggleWish,
} from '../lib/hub';
import { reviewCountLabel } from '../lib/spotScore';
import type { GearReview, HubChatMessage, HubTip, HubView } from '../types';
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

export function HubScreen() {
  const [view, setView] = useState<HubView>('home');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [wish, setWish] = useState(loadWishIds);
  const [messages, setMessages] = useState(loadChatMessages);
  const [reviews, setReviews] = useState(loadGearReviews);
  const [tipId, setTipId] = useState<string | null>(null);

  const back = () => {
    if (view === 'chat') {
      setView('community');
      setRoomId(null);
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
        ? (roomById(roomId ?? '')?.name ?? '群聊')
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
          onOpen={(next) => {
            setTipId(null);
            setView(next);
          }}
          onOpenRoom={(id) => {
            setRoomId(id);
            setView('chat');
          }}
          onOpenTip={(id) => {
            setTipId(id);
            setView('tips');
          }}
        />
      ) : null}
      {view === 'mall' ? <Mall wish={wish} onWish={(id) => setWish(toggleWish(id, wish))} /> : null}
      {view === 'events' ? <Events /> : null}
      {view === 'tips' ? <Tips tipId={tipId} onOpen={setTipId} /> : null}
      {view === 'reviews' ? (
        <Reviews
          reviews={reviews}
          onSave={(next) => setReviews(next)}
        />
      ) : null}
      {view === 'community' ? (
        <Community
          onOpen={(id) => {
            setRoomId(id);
            setView('chat');
          }}
        />
      ) : null}
      {view === 'chat' && roomId ? (
        <Chat
          roomId={roomId}
          messages={messages}
          onSend={(body) => setMessages(appendChatMessage(roomId, body))}
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
  onOpen,
  onOpenRoom,
  onOpenTip,
}: {
  onOpen: (view: Exclude<HubView, 'home' | 'chat'>) => void;
  onOpenRoom: (roomId: string) => void;
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
            社区在聊<em>{HUB_ROOMS.length}</em>
          </h3>
          <button type="button" className="share-more" onClick={() => onOpen('community')}>
            进群 ›
          </button>
        </header>
        <ul className="hub-rooms">
          {HUB_ROOMS.slice(0, 3).map((room, index) => (
            <li key={room.id}>
              <button type="button" data-tone={index === 0 ? 'live' : 'dim'} onClick={() => onOpenRoom(room.id)}>
                <em>{room.members}</em>
                <div>
                  <strong>{room.name}</strong>
                  <span>{room.topic}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
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
        <button type="submit">提交到本机</button>
      </form>
    </>
  );
}

function Community({ onOpen }: { onOpen: (roomId: string) => void }) {
  return (
    <ul className="hub-cards">
      {HUB_ROOMS.map((room) => (
        <li key={room.id}>
          <button type="button" className="hub-card hub-open" onClick={() => onOpen(room.id)}>
            <p className="share-kicker">{room.members} 人 · 本机群聊</p>
            <strong>{room.name}</strong>
            <span>{room.topic}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Chat({
  roomId,
  messages,
  onSend,
}: {
  roomId: string;
  messages: HubChatMessage[];
  onSend: (body: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const rows = useMemo(() => messagesForRoom(roomId, messages), [roomId, messages]);
  const room = roomById(roomId);

  return (
    <div className="hub-chat">
      <p className="muted">{room?.topic} · 消息只留在本机</p>
      <ul className="hub-chat-log">
        {rows.map((row) => (
          <li key={row.id} data-mine={row.source === 'user' ? 'true' : 'false'}>
            <strong>
              {row.author}
              {row.source !== 'user' ? ' · 示例' : ''}
            </strong>
            <p>{row.body}</p>
            <em>{formatRelativeTime(row.createdAt)}</em>
          </li>
        ))}
      </ul>
      <form
        className="hub-chat-form"
        onSubmit={(ev) => {
          ev.preventDefault();
          onSend(draft);
          setDraft('');
        }}
      >
        <input value={draft} onChange={(ev) => setDraft(ev.target.value)} placeholder="说一句口讯…" />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
