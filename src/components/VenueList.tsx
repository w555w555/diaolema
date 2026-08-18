import { useMemo, useState } from 'react';
import { DIANPING_COLLECTED_AT, DIANPING_DISCLAIMER, DIANPING_VENUES, searchVenues, venueAvatar } from '../lib/venues';
import { coverPhotoForVenue, rankVenues, reviewCountLabel, reviewsForVenue, scoreForVenue } from '../lib/spotScore';
import type { FishingVenue, SpotReview } from '../types';
import { SpotStars } from './SpotStars';

type Props = {
  reviews: SpotReview[];
  onOpen: (venue: FishingVenue) => void;
  onNavigate: (venue: FishingVenue) => void;
  onFocus?: (venue: FishingVenue) => void;
};

export function VenueList({ reviews, onOpen, onNavigate, onFocus }: Props) {
  const [query, setQuery] = useState('');
  const ranked = useMemo(() => rankVenues(DIANPING_VENUES, reviews), [reviews]);
  const rankOf = useMemo(() => new Map(ranked.map((venue, index) => [venue.id, index + 1])), [ranked]);
  const rows = useMemo(() => searchVenues(ranked, query), [ranked, query]);

  return (
    <section className="panel feed">
      <h2>钓场排行</h2>
      <p className="muted legal">
        {DIANPING_DISCLAIMER} 整理日期 {DIANPING_COLLECTED_AT}。按渔见五星从高到低（演示虚拟评分 + 公开图库照片，须标明示例）。搜索后仍显示原来的名次。点条目进入本机详情。
      </p>
      <input
        className="venue-search"
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        placeholder="搜索店名、区县、路名"
      />
      <ul>
        {rows.map((venue) => {
          const cover = coverPhotoForVenue(venue.id, reviews);
          const count = reviewsForVenue(venue.id, reviews).length;
          return (
            <li key={venue.id} className="venue-row">
              <button type="button" className="venue-open" onClick={() => onOpen(venue)}>
                <em className="venue-rank">{rankOf.get(venue.id)}</em>
                <img
                  className="venue-thumb"
                  data-logo={cover ? 'false' : 'true'}
                  src={venueAvatar(cover)}
                  alt=""
                />
                <div className="venue-copy">
                  <strong>{venue.name}</strong>
                  <span className="venue-stars">
                    <SpotStars score={scoreForVenue(venue.id, reviews)} />
                    <b className="venue-count">{reviewCountLabel(count)}</b>
                  </span>
                  <span>
                    {venue.district}
                    {venue.addressHint ? ` · ${venue.addressHint}` : ''} · {venue.kind} · {venue.statusLabel}
                  </span>
                </div>
              </button>
              <span className="venue-actions">
                <button type="button" className="ghost" onClick={() => onFocus?.(venue)}>
                  看地图
                </button>
                <button type="button" className="ghost" onClick={() => onNavigate(venue)}>
                  导航
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="muted">没有匹配的钓场。</p> : null}
    </section>
  );
}
