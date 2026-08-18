import { useSyncExternalStore, type CSSProperties } from 'react';
import { formatRelativeTime, sourceLabel } from '../lib/caption';
import { HOME_SHARE_LIMIT, shareBody, shareCover } from '../lib/catchThumb';
import {
  coverRatio,
  getShareSocial,
  likeCount,
  subscribeShareSocial,
  toggleFollow,
  toggleLike,
} from '../lib/shareSocial';
import type { CatchReport } from '../types';

type Props = {
  reports: CatchReport[];
  onOpenAll: () => void;
  onOpenDetail: (report: CatchReport) => void;
};

function useShareSocial() {
  return useSyncExternalStore(subscribeShareSocial, getShareSocial, getShareSocial);
}

export function CatchShareFeed({ reports, onOpenAll, onOpenDetail }: Props) {
  const social = useShareSocial();
  const items = [...reports]
    .sort((a, b) => new Date(b.caughtAt).getTime() - new Date(a.caughtAt).getTime())
    .slice(0, HOME_SHARE_LIMIT);

  return (
    <section className="share-feed">
      <div className="share-head">
        <h3>
          今日渔获<em>{reports.length}</em>
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
                    <span className="share-fish">{report.fish}</span>
                  </span>
                  <strong>{report.title || `${report.fish} · ${report.spotName}`}</strong>
                </button>
                <div className="share-foot">
                  <span className="share-spot">{report.spotName}</span>
                  <button
                    type="button"
                    className="share-follow"
                    data-on={following ? 'true' : 'false'}
                    onClick={() => toggleFollow(report.author)}
                  >
                    {following ? '已关注' : '关注'}
                  </button>
                  <button
                    type="button"
                    className="share-like"
                    data-on={liked ? 'true' : 'false'}
                    onClick={() => toggleLike(report.id)}
                  >
                    ♥ {likeCount(report.id, social.likes)}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function CatchShareDetail({
  report,
  onGoSpot,
}: {
  report: CatchReport;
  onGoSpot: () => void;
}) {
  const social = useShareSocial();
  const body = shareBody(report.note);
  const liked = social.likes.includes(report.id);
  const following = social.follows.includes(report.author);

  return (
    <article className="share-detail">
      <div className="share-hero">
        <img src={shareCover(report)} alt="" />
        {report.source !== 'user' ? <span className="share-demo">示例</span> : null}
        <span className="share-hero-meta">
          <strong>{report.author}</strong>
          <em>
            {formatRelativeTime(report.caughtAt)} · {sourceLabel(report.source)}
          </em>
        </span>
      </div>
      <div className="share-detail-head">
        <p className="share-kicker">
          {report.source !== 'user' ? '示例整理' : '钓友上报'} · {report.fish} · {report.spotName}
        </p>
        <button
          type="button"
          className="share-follow"
          data-on={following ? 'true' : 'false'}
          onClick={() => toggleFollow(report.author)}
        >
          {following ? '已关注' : '关注'}
        </button>
      </div>
      <h3>{report.title || `${report.author}钓到了${report.fish}`}</h3>
      <p className="share-body">{body || '这条分享还没有正文。'}</p>
      <div className="share-actions">
        <button
          type="button"
          className="share-like"
          data-on={liked ? 'true' : 'false'}
          onClick={() => toggleLike(report.id)}
        >
          ♥ {likeCount(report.id, social.likes)}
        </button>
        <button type="button" className="share-go" onClick={onGoSpot}>
          去钓点
        </button>
      </div>
    </article>
  );
}
