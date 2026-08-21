import { useEffect, useState } from 'react';
import { formatRelativeTime } from '../lib/caption';
import { buildAmapNavUrl } from '../lib/navigation';
import { createSpotReview, persistSpotReview } from '../lib/spotReviews';
import { cloudWrite, pushSpotReview, pushVenueFav } from '../lib/userCloud';
import { isVenueFaved, toggleVenueFav } from '../lib/venueFav';
import { coverPhotoForVenue, reviewCountLabel, reviewsForVenue, scoreForVenue } from '../lib/spotScore';
import { DIANPING_VENUES, catchesForVenue, nearbyVenues, venueAvatar, venueDistanceLabel, venueSourceLabel } from '../lib/venues';
import { SpotStars } from './SpotStars';
import type { CatchReport, FishingVenue, SpotReview } from '../types';

type Props = {
  venue: FishingVenue;
  reviews: SpotReview[];
  reports: CatchReport[];
  fromLat: number;
  fromLon: number;
  onReviewsChange: (next: SpotReview[]) => void;
  onPreviewRoute: () => void;
  onOpenVenue?: (venue: FishingVenue) => void;
  onUseForAdvice?: (venue: FishingVenue) => void;
};

export function VenueDetail({
  venue,
  reviews,
  reports,
  fromLat,
  fromLon,
  onReviewsChange,
  onPreviewRoute,
  onOpenVenue,
  onUseForAdvice,
}: Props) {
  const items = reviewsForVenue(venue.id, reviews);
  const score = scoreForVenue(venue.id, reviews);
  const photos = items.filter((row) => row.imageUrl);
  const cover = coverPhotoForVenue(venue.id, reviews);
  const catches = catchesForVenue(venue, reports);
  const nearby = nearbyVenues(venue, DIANPING_VENUES, 3);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [faved, setFaved] = useState(() => isVenueFaved(venue.id));
  const address = `${venue.district}${venue.addressHint ? ` · ${venue.addressHint}` : ''}`;

  useEffect(() => {
    setFaved(isVenueFaved(venue.id));
  }, [venue.id]);

  return (
    <article className="spot-detail">
      <img className="spot-hero" data-logo={cover ? 'false' : 'true'} src={venueAvatar(cover)} alt="" />
      <p className="share-kicker">
        {venueDistanceLabel(venue, fromLat, fromLon)} · {address} · {venue.kind}
      </p>
      <h3>{venue.name}</h3>
      <p className="spot-score-line">
        <SpotStars score={score} />
        <span>
          {score == null ? '新钓点 · 还没有反馈' : `渔见评分 · ${reviewCountLabel(items.length)}`}
        </span>
      </p>
      <p className="muted">
        {venue.feeLabel} · {venue.statusLabel} · {venueSourceLabel(venue.catalogSource)}
      </p>
      <div className="share-actions share-actions-nav">
        <a
          className="share-go"
          href={buildAmapNavUrl({
            fromLon,
            fromLat,
            fromName: '我的位置',
            toLon: venue.lon,
            toLat: venue.lat,
            toName: venue.name,
          })}
          target="_blank"
          rel="noopener noreferrer"
        >
          打开高德地图
        </a>
        <button type="button" className="ghost" onClick={onPreviewRoute}>
          看路线
        </button>
        {onUseForAdvice ? (
          <button type="button" className="ghost" onClick={() => onUseForAdvice(venue)}>
            用于今日方案
          </button>
        ) : null}
        <button
          type="button"
          className={faved ? 'active' : 'ghost'}
          onClick={() => {
            const next = toggleVenueFav(venue.id);
            const on = next.includes(venue.id);
            setFaved(on);
            cloudWrite(pushVenueFav(venue.id, on));
          }}
        >
          {faved ? '已收藏' : '收藏'}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(`${venue.name} ${address}`).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? '已复制地址' : '复制地址'}
        </button>
      </div>

      {photos.length > 0 ? (
        <ul className="spot-photos">
          {photos.map((row) => (
            <li key={row.id}>
              <img src={row.imageUrl} alt="" />
            </li>
          ))}
        </ul>
      ) : null}

      <h4>附近钓场</h4>
      <ul className="spot-nearby">
        {nearby.map((row) => (
          <li key={row.id}>
            <button type="button" className="ghost" onClick={() => onOpenVenue?.(row)}>
              {row.name}
              <span>
                {venueDistanceLabel(row, venue.lat, venue.lon)} · {row.district}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <h4>客户反馈</h4>
      {items.length === 0 ? (
        <p className="muted">还没有反馈。来过的钓友可以打分留言。</p>
      ) : (
        <ul className="spot-reviews">
          {items.map((row) => (
            <li key={row.id}>
              {row.imageUrl ? <img src={row.imageUrl} alt="" /> : null}
              <strong>
                {row.author} · {'★'.repeat(row.rating)}
                {row.source !== 'user' ? ' · 示例' : ''}
              </strong>
              <p>{row.body}</p>
              <em>{formatRelativeTime(row.createdAt)}</em>
            </li>
          ))}
        </ul>
      )}

      {catches.length > 0 ? (
        <>
          <h4>近期渔获</h4>
          <ul className="spot-catches">
            {catches.slice(0, 4).map((row) => (
              <li key={row.id}>
                {row.fish} · {formatRelativeTime(row.caughtAt)} · {row.author}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <form
        className="spot-form"
        onSubmit={(ev) => {
          ev.preventDefault();
          const review = createSpotReview({
            venueId: venue.id,
            author: '我',
            rating,
            body: body.trim() || '到场打卡。',
          });
          onReviewsChange(persistSpotReview(review));
          cloudWrite(pushSpotReview(review));
          setBody('');
        }}
      >
        <h4>我要反馈</h4>
        <div className="spot-stars" role="radiogroup" aria-label="评分">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button key={n} type="button" data-on={rating >= n ? 'true' : 'false'} onClick={() => setRating(n)}>
              ★
            </button>
          ))}
        </div>
        <textarea value={body} onChange={(ev) => setBody(ev.target.value)} placeholder="路况、鱼情、设施……" rows={3} />
        <button type="submit">提交反馈</button>
      </form>
    </article>
  );
}
