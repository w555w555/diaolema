import { useMemo, useState } from 'react';
import {
  DIANPING_COLLECTED_AT,
  DIANPING_DISCLAIMER,
  DIANPING_VENUES,
  filterVenues,
  nearbyPonds,
  venueAvatar,
  venueDistanceLabel,
  venueMarkerKindLabel,
  venueMarkerTone,
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
  onNavigate?: (venue: FishingVenue) => void;
  mode?: 'nearby' | 'rank';
};

const KIND_CHIPS: { id: VenueKindFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'pond', label: '池塘' },
  { id: 'lure', label: '路亚' },
  { id: 'sea', label: '海钓' },
];

const NEARBY_TITLE: Record<VenueKindFilter, string> = {
  all: '附近钓场',
  pond: '附近鱼塘',
  lure: '附近路亚',
  sea: '附近海钓',
};

export function VenueList({ reviews, fromLat, fromLon, onOpen, onNavigate, mode = 'nearby' }: Props) {
  const nearby = mode === 'nearby';
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<VenueKindFilter>(nearby ? 'pond' : 'all');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState<VenueSort>(nearby ? 'near' : 'score');
  const from = useMemo(() => ({ lat: fromLat, lon: fromLon }), [fromLat, fromLon]);
  const ponds = useMemo(() => nearbyPonds(from, DIANPING_VENUES, 8), [from]);
  const rankOf = useMemo(() => {
    if (nearby) return new Map<string, number>();
    return new Map(rankVenues(DIANPING_VENUES, reviews).map((venue, index) => [venue.id, index + 1]));
  }, [nearby, reviews]);
  const rows = useMemo(
    () =>
      filterVenues(DIANPING_VENUES, reviews, {
        query,
        kind,
        openOnly,
        sort,
        from,
      }),
    [reviews, query, kind, openOnly, sort, from],
  );

  return (
    <section className={nearby ? 'dp-nearby' : 'panel feed'}>
      <header className="dp-nearby-head">
        <h2>{nearby ? NEARBY_TITLE[kind] : '钓场排行'}</h2>
        <p className="muted legal">
          {nearby ? '按当前位置由近到远，点评式卡片。' : '默认按渔见五星从高到低。'}
          {DIANPING_DISCLAIMER} 整理日期 {DIANPING_COLLECTED_AT}。点卡片进入本机详情。
        </p>
      </header>
      {nearby && ponds.length > 0 ? (
        <div className="dp-pond-strip" aria-label="附近鱼塘">
          {ponds.map((venue) => {
            const cover = coverPhotoForVenue(venue.id, reviews);
            return (
              <button key={venue.id} type="button" className="dp-pond-chip" onClick={() => onOpen(venue)}>
                <img src={venueAvatar(cover)} alt="" data-logo={cover ? 'false' : 'true'} />
                <strong>{venue.name}</strong>
                <span>{venueDistanceLabel(venue, fromLat, fromLon)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
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
        <button type="button" data-on={sort === 'near' ? 'true' : 'false'} onClick={() => setSort('near')}>
          离我近
        </button>
        <button type="button" data-on={sort === 'score' ? 'true' : 'false'} onClick={() => setSort('score')}>
          渔见分
        </button>
      </div>
      <ul className={nearby ? 'dp-shop-list' : undefined}>
        {rows.map((venue) => {
          const cover = coverPhotoForVenue(venue.id, reviews);
          const count = reviewsForVenue(venue.id, reviews).length;
          const tone = venueMarkerTone(venue.kind);
          return (
            <li key={venue.id} className={nearby ? 'dp-shop' : 'venue-row'}>
              <button type="button" className={nearby ? 'dp-shop-open' : 'venue-open'} onClick={() => onOpen(venue)}>
                {!nearby ? <em className="venue-rank">{rankOf.get(venue.id)}</em> : null}
                <img
                  className={nearby ? 'dp-shop-cover' : 'venue-thumb'}
                  data-logo={cover ? 'false' : 'true'}
                  src={venueAvatar(cover)}
                  alt=""
                />
                <div className={nearby ? 'dp-shop-copy' : 'venue-copy'}>
                  <span className={nearby ? 'dp-shop-title' : undefined}>
                    <strong>{venue.name}</strong>
                    {nearby ? <b className="dp-shop-dist">{venueDistanceLabel(venue, fromLat, fromLon)}</b> : null}
                  </span>
                  <span className="venue-stars">
                    <SpotStars score={scoreForVenue(venue.id, reviews)} />
                    <b className="venue-count">{reviewCountLabel(count)}</b>
                  </span>
                  {nearby ? (
                    <>
                      <span className="dp-shop-tags">
                        <i>{venueMarkerKindLabel(tone)}</i>
                        <i>{venue.district}</i>
                        {venue.status === 'open' ? <i data-ok="true">{venue.statusLabel}</i> : <i>{venue.statusLabel}</i>}
                      </span>
                      <span className="dp-shop-meta">
                        {venue.feeLabel}
                        {venue.addressHint ? ` · ${venue.addressHint}` : ''}
                      </span>
                    </>
                  ) : (
                    <span>
                      {venueDistanceLabel(venue, fromLat, fromLon)} · {venue.district}
                      {venue.addressHint ? ` · ${venue.addressHint}` : ''} · {venue.kind} · {venue.statusLabel}
                    </span>
                  )}
                </div>
              </button>
              <span className="venue-actions">
                <button type="button" className="ghost" onClick={() => onNavigate?.(venue)}>
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
