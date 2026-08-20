import { useMemo, useState } from 'react';
import { buildAmapNavUrl } from '../lib/navigation';
import {
  DIANPING_COLLECTED_AT,
  DIANPING_DISCLAIMER,
  DIANPING_VENUES,
  filterVenues,
  venueAvatar,
  venueDistanceLabel,
  type VenueKindFilter,
  type VenueSort,
} from '../lib/venues';
import { coverPhotoForVenue, rankVenues, reviewCountLabel, reviewsForVenue, scoreForVenue } from '../lib/spotScore';
import type { FishingVenue, SpotReview } from '../types';
import { SpotStars } from './SpotStars';

type Props = {
  reviews: SpotReview[];
  fromLat: number;
  fromLon: number;
  onOpen: (venue: FishingVenue) => void;
  onFocus?: (venue: FishingVenue) => void;
};

const KIND_CHIPS: { id: VenueKindFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'lure', label: '路亚' },
  { id: 'pond', label: '池塘' },
  { id: 'sea', label: '海钓' },
];

export function VenueList({ reviews, fromLat, fromLon, onOpen, onFocus }: Props) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<VenueKindFilter>('all');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState<VenueSort>('score');
  const ranked = useMemo(() => rankVenues(DIANPING_VENUES, reviews), [reviews]);
  const rankOf = useMemo(() => new Map(ranked.map((venue, index) => [venue.id, index + 1])), [ranked]);
  const rows = useMemo(
    () =>
      filterVenues(DIANPING_VENUES, reviews, {
        query,
        kind,
        openOnly,
        sort,
        from: { lat: fromLat, lon: fromLon },
      }),
    [reviews, query, kind, openOnly, sort, fromLat, fromLon],
  );

  return (
    <section className="panel feed">
      <h2>钓场排行</h2>
      <p className="muted legal">
        {DIANPING_DISCLAIMER} 整理日期 {DIANPING_COLLECTED_AT}。默认按渔见五星从高到低（演示虚拟评分 + 公开图库照片，须标明示例）。搜索或筛选后仍显示原来的名次。点条目进入本机详情。
      </p>
      <input
        className="venue-search"
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        placeholder="搜索店名、区县、路名"
      />
      <div className="venue-chips" role="toolbar" aria-label="钓场筛选">
        {KIND_CHIPS.map((chip) => (
          <button key={chip.id} type="button" data-on={kind === chip.id ? 'true' : 'false'} onClick={() => setKind(chip.id)}>
            {chip.label}
          </button>
        ))}
        <button type="button" data-on={openOnly ? 'true' : 'false'} onClick={() => setOpenOnly((value) => !value)}>
          营业中
        </button>
        <button type="button" data-on={sort === 'score' ? 'true' : 'false'} onClick={() => setSort('score')}>
          渔见分
        </button>
        <button type="button" data-on={sort === 'near' ? 'true' : 'false'} onClick={() => setSort('near')}>
          离我近
        </button>
      </div>
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
                    {venueDistanceLabel(venue, fromLat, fromLon)} · {venue.district}
                    {venue.addressHint ? ` · ${venue.addressHint}` : ''} · {venue.kind} · {venue.statusLabel}
                  </span>
                </div>
              </button>
              <span className="venue-actions">
                <button type="button" className="ghost" onClick={() => onFocus?.(venue)}>
                  看地图
                </button>
                <a
                  className="ghost"
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
                  导航
                </a>
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="muted">没有匹配的钓场。</p> : null}
    </section>
  );
}
