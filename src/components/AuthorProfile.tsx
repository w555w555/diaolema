import { useSyncExternalStore } from 'react';
import { authorCard, reportsByAuthor } from '../lib/authorProfile';
import { shareCover } from '../lib/catchThumb';
import { cloudWrite, pushFollow } from '../lib/userCloud';
import { getShareSocial, subscribeShareSocial, toggleFollow } from '../lib/shareSocial';
import { getSafety, subscribeSafety } from '../lib/userSafety';
import type { CatchReport } from '../types';
import { SafetyActions } from './SafetyActions';
import { CatchMediaBadge } from './CatchMediaBadge';

export function AuthorProfile({
  name,
  reports,
  onOpenCatch,
}: {
  name: string;
  reports: CatchReport[];
  onOpenCatch: (report: CatchReport) => void;
}) {
  const social = useSyncExternalStore(subscribeShareSocial, getShareSocial, getShareSocial);
  const safety = useSyncExternalStore(subscribeSafety, getSafety, getSafety);
  const card = authorCard(name);
  const wall = reportsByAuthor(reports, name);
  const following = social.follows.includes(name);
  const blocked = safety.blocks.includes(name.trim());

  return (
    <section className="author-page">
      <header className="author-hero">
        <i aria-hidden>{name.slice(-1)}</i>
        <div>
          <strong>{name}</strong>
          <span>
            {card.city} · {card.note}
            {card.sample ? ' · 示例' : ''}
          </span>
        </div>
        <button
          type="button"
          className="share-follow"
          data-on={following ? 'true' : 'false'}
          onClick={() => {
            const next = toggleFollow(name);
            cloudWrite(pushFollow(name, next.follows.includes(name)));
          }}
        >
          {following ? '已关注' : '关注'}
        </button>
      </header>
      <SafetyActions name={name} />
      {blocked ? (
        <p className="muted">已拉黑此人，不再看他的渔获。可在上方解除。</p>
      ) : wall.length === 0 ? (
        <p className="muted">这个钓友还没有渔获墙。</p>
      ) : (
        <ul className="author-wall">
          {wall.map((report) => (
            <li key={report.id}>
              <button type="button" onClick={() => onOpenCatch(report)}>
                <img src={shareCover(report)} alt="" />
                <CatchMediaBadge report={report} />
                <strong>{report.fish}</strong>
                <span>{report.spotName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
