import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { formatRelativeTime, sourceLabel } from '../lib/caption';
import { HOME_SHARE_LIMIT, shareBody, shareCover } from '../lib/catchThumb';
import { catchImages, catchVideoUrl } from '../lib/catchMedia';
import { addComment, loadComments } from '../lib/shareComments';
import { loadProfile } from '../lib/meProfile';
import { HUB_ROOMS } from '../lib/hub';
import { appendChatMessage } from '../lib/hub';
import { sendRoomMessage } from '../lib/hubChat';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { repostChatBody, shareCaption } from '../lib/shareRepost';
import {
  coverRatio,
  getShareSocial,
  likeCount,
  subscribeShareSocial,
  toggleFollow,
  toggleLike,
} from '../lib/shareSocial';
import { cloudWrite, pushComment, pushFollow, pushLike } from '../lib/userCloud';
import { getSafety, hideByAuthor, subscribeSafety } from '../lib/userSafety';
import type { CatchReport } from '../types';
import { SafetyActions } from './SafetyActions';
import { CatchMediaBadge } from './CatchMediaBadge';

type Props = {
  reports: CatchReport[];
  onOpenAll: () => void;
  onOpenDetail: (report: CatchReport) => void;
  showFollow?: boolean;
  limit?: number;
};

function useShareSocial() {
  return useSyncExternalStore(subscribeShareSocial, getShareSocial, getShareSocial);
}

function useSafety() {
  return useSyncExternalStore(subscribeSafety, getSafety, getSafety);
}

export function CatchShareFeed({ reports, onOpenAll, onOpenDetail, showFollow = true, limit = HOME_SHARE_LIMIT }: Props) {
  const social = useShareSocial();
  const safety = useSafety();
  const items = hideByAuthor([...reports], safety.blocks)
    .sort((a, b) => new Date(b.caughtAt).getTime() - new Date(a.caughtAt).getTime())
    .slice(0, limit);

  return (
    <section className="share-feed">
      <div className="share-head">
        <h3>
          今日渔获<em>{hideByAuthor(reports, safety.blocks).length}</em>
        </h3>
        <button type="button" className="share-more" onClick={onOpenAll}>
          全部 ›
        </button>
      </div>
      {items.length === 0 ? (
        <p className="share-empty">还没有渔获分享。识鱼或上报后会出现在这里。</p>
      ) : (
        <ul className="share-masonry">
          {items.map((report) => {
            const liked = social.likes.includes(report.id);
            const following = social.follows.includes(report.author);
            return (
              <li
                key={report.id}
                className="share-card"
                style={{ '--share-ratio': coverRatio(report.id) } as CSSProperties}
              >
                <button type="button" className="share-hit" onClick={() => onOpenDetail(report)}>
                  <span className="share-cover">
                    <img src={shareCover(report)} alt="" />
                    {report.source !== 'user' ? <span className="share-demo">示例</span> : null}
                    <CatchMediaBadge report={report} />
                    <span className="share-fish">{report.fish}</span>
                  </span>
                  <strong>{report.title || `${report.fish} · ${report.spotName}`}</strong>
                </button>
                <div className="share-foot">
                  <span className="share-spot">{report.spotName}</span>
                  {showFollow ? (
                    <button
                      type="button"
                      className="share-follow"
                      data-on={following ? 'true' : 'false'}
                      onClick={() => {
                        const next = toggleFollow(report.author);
                        cloudWrite(pushFollow(report.author, next.follows.includes(report.author)));
                      }}
                    >
                      {following ? '已关注' : '关注'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="share-like"
                    data-on={liked ? 'true' : 'false'}
                    onClick={() => {
                      const next = toggleLike(report.id);
                      cloudWrite(pushLike(report.id, next.likes.includes(report.id)));
                    }}
                  >
                    ♥ {likeCount(report.id, social.likes)}
                  </button>
                  <span className="share-comments">评 {hideByAuthor(loadComments(report.id, report.source), safety.blocks).length}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CatchShareHero({
  report,
  onOpenAuthor,
}: {
  report: CatchReport;
  onOpenAuthor: (name: string) => void;
}) {
  const images = catchImages(report);
  const video = catchVideoUrl(report);
  const slides = [
    ...(video ? [{ kind: 'video' as const, url: video }] : []),
    ...images.map((url) => ({ kind: 'image' as const, url })),
  ];
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const hasVideo = Boolean(video);

  return (
    <div className="share-hero" data-video={hasVideo ? 'true' : 'false'}>
      {slides.length <= 1 && !hasVideo ? (
        <img src={shareCover(report)} alt="" />
      ) : (
        <div
          className="share-gallery"
          ref={scroller}
          onScroll={() => {
            const node = scroller.current;
            if (!node) return;
            const width = node.clientWidth || 1;
            setIndex(Math.round(node.scrollLeft / width));
          }}
        >
          {slides.map((slide, i) =>
            slide.kind === 'video' ? (
              <video key={`v-${i}`} src={slide.url} poster={images[0]} controls playsInline />
            ) : (
              <img key={`${slide.url}-${i}`} src={slide.url} alt="" />
            ),
          )}
        </div>
      )}
      {slides.length > 1 ? (
        <span className="share-gallery-dots" aria-hidden>
          {slides.map((_, i) => (
            <i key={i} data-on={i === index ? 'true' : 'false'} />
          ))}
        </span>
      ) : null}
      {report.source !== 'user' ? <span className="share-demo">示例</span> : null}
      <button type="button" className="share-hero-meta" onClick={() => onOpenAuthor(report.author)}>
        <strong>{report.author}</strong>
        <em>
          {formatRelativeTime(report.caughtAt)} · {sourceLabel(report.source)} · 主页
        </em>
      </button>
    </div>
  );
}

export function CatchShareDetail({
  report,
  onGoSpot,
  onOpenAuthor,
  onNeedLogin,
}: {
  report: CatchReport;
  onGoSpot: () => void;
  onOpenAuthor: (name: string) => void;
  onNeedLogin: () => void;
}) {
  const social = useShareSocial();
  const safety = useSafety();
  const body = shareBody(report.note);
  const liked = social.likes.includes(report.id);
  const following = social.follows.includes(report.author);
  const [comments, setComments] = useState(() => loadComments(report.id, report.source));
  const visibleComments = hideByAuthor(comments, safety.blocks);
  const [draft, setDraft] = useState('');
  const [repostOpen, setRepostOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <article className="share-detail">
      <CatchShareHero report={report} onOpenAuthor={onOpenAuthor} />
      <div className="share-detail-head">
        <p className="share-kicker">
          {report.source !== 'user' ? '示例整理' : '钓友上报'} · {report.fish} · {report.spotName}
        </p>
        <button
          type="button"
          className="share-follow"
          data-on={following ? 'true' : 'false'}
          onClick={() => {
            const next = toggleFollow(report.author);
            cloudWrite(pushFollow(report.author, next.follows.includes(report.author)));
          }}
        >
          {following ? '已关注' : '关注'}
        </button>
      </div>
      <SafetyActions name={report.author} />
      <h3>{report.title || `${report.author}钓到了${report.fish}`}</h3>
      <p className="share-body">{body || '这条分享还没有正文。'}</p>
      <div className="share-actions">
        <button
          type="button"
          className="share-like"
          data-on={liked ? 'true' : 'false'}
          onClick={() => {
            const next = toggleLike(report.id);
            cloudWrite(pushLike(report.id, next.likes.includes(report.id)));
          }}
        >
          ♥ {likeCount(report.id, social.likes)}
        </button>
        <button type="button" className="ghost" onClick={() => setRepostOpen((open) => !open)}>
          转发
        </button>
        <button type="button" className="share-go" onClick={onGoSpot}>
          去钓点
        </button>
      </div>
      {hint ? <p className="hub-chat-hint">{hint}</p> : null}
      {repostOpen ? (
        <div className="share-repost">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(shareCaption(report)).then(
                () => setHint('已复制分享文案'),
                () => setHint('复制失败'),
              );
            }}
          >
            复制文案
          </button>
          {HUB_ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              className="ghost"
              onClick={() => {
                const text = repostChatBody(report);
                appendChatMessage(room.id, text, { kind: 'share' });
                if (isSupabaseConfigured()) {
                  if (!signedIn) {
                    setHint(`已转到${room.name}（本机）。登录后会同步到公网群。`);
                    onNeedLogin();
                    return;
                  }
                  void sendRoomMessage(room.id, text)
                    .then(() => setHint(`已转到${room.name}，点聊天里的卡片可打开`))
                    .catch(() => setHint(`已转到${room.name}（本机）。公网同步失败。`));
                  return;
                }
                setHint(`已转到${room.name}，点聊天里的卡片可打开`);
              }}
            >
              发到{room.name}
            </button>
          ))}
        </div>
      ) : null}
      <section className="share-comment-block">
        <h4>评论 · {visibleComments.length}</h4>
        {visibleComments.length === 0 ? <p className="muted">还没有评论。</p> : null}
        <ul className="share-comment-list">
          {visibleComments.map((row) => (
            <li key={row.id}>
              <strong>
                {row.author}
                {row.source !== 'user' ? ' · 示例' : ''}
              </strong>
              <p>{row.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="share-comment-form"
          onSubmit={(ev) => {
            ev.preventDefault();
            const before = new Set(comments.map((row) => row.id));
            addComment(report.id, draft, loadProfile().name);
            const next = loadComments(report.id, report.source);
            if (next.length === comments.length && !draft.trim()) return;
            const added = next.find((row) => row.source === 'user' && !before.has(row.id));
            if (added) cloudWrite(pushComment(added));
            setComments(next);
            setDraft('');
          }}
        >
          <input value={draft} maxLength={120} onChange={(ev) => setDraft(ev.target.value)} placeholder="说两句…" />
          <button type="submit">评论</button>
        </form>
      </section>
    </article>
  );
}
