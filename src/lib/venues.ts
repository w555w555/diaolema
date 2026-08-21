import { venueKindDataUri } from './venueIcons';
import { escapeHtml } from './caption';
import { distanceKm, formatDistanceKm } from './geo';
import { rankVenues, starsHtml } from './spotScore';
import type { CatchReport, FishingVenue, SpotReview, VenueStatus } from '../types';
import raw from '../data/dianping-venues.json';

type VenueFile = {
  disclaimer: string;
  collectedAt: string;
  venues: FishingVenue[];
};

const catalog = raw as VenueFile;

export const DIANPING_DISCLAIMER = catalog.disclaimer;
export const DIANPING_COLLECTED_AT = catalog.collectedAt;
export const DIANPING_VENUES: FishingVenue[] = catalog.venues;

export function formatVenueFee(avgPriceYuan: number | null, fallback = '收费未公开'): string {
  if (avgPriceYuan == null || Number.isNaN(avgPriceYuan)) return fallback;
  return `¥${avgPriceYuan}/人`;
}

export function detectVenueStatus(text: string): { status: VenueStatus; statusLabel: string } {
  if (/已关门|商户关门/.test(text)) return { status: 'closed', statusLabel: '已关门' };
  if (/暂停营业/.test(text)) return { status: 'paused', statusLabel: '暂停营业' };
  if (/休息中/.test(text)) return { status: 'paused', statusLabel: '休息中' };
  if (/营业中/.test(text)) return { status: 'open', statusLabel: '营业中' };
  return { status: 'unknown', statusLabel: '状态未公开' };
}

export function parseDianpingShopSnippet(
  text: string,
  url: string,
): Pick<FishingVenue, 'name' | 'avgPriceYuan' | 'feeLabel' | 'status' | 'statusLabel' | 'district'> | null {
  const name = text.match(/【([^】]+)】/)?.[1]?.trim();
  if (!name) return null;
  if (!/上海|青浦|奉贤|浦东|嘉定|松江|金山|崇明|宝山|闵行|航头|江镇/.test(text + url)) return null;
  if (/海淀|余杭|西湖|荔湾|南山|吴中|明发/.test(text)) return null;
  const price = text.match(/¥\s*(\d+)\s*\/\s*人/);
  const avgPriceYuan = price ? Number(price[1]) : null;
  const district = text.match(/(青浦区|奉贤区|浦东新区|嘉定区|松江区|金山区|崇明区|宝山区|闵行区|静安区)/)?.[1] || '';
  const { status, statusLabel } = detectVenueStatus(text);
  return {
    name,
    avgPriceYuan,
    feeLabel: formatVenueFee(avgPriceYuan),
    status,
    statusLabel,
    district,
  };
}

export function venueSpots(): { name: string; lon: number; lat: number }[] {
  return DIANPING_VENUES.map((venue) => ({
    name: venue.name,
    lon: venue.lon,
    lat: venue.lat,
  }));
}

export function searchVenues(venues: FishingVenue[], query: string): FishingVenue[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return venues;
  return venues.filter((venue) => {
    const hay = `${venue.name}${venue.district}${venue.addressHint}${venue.kind}`.toLowerCase();
    return hay.includes(needle);
  });
}

export function venueSourceLabel(source?: FishingVenue['catalogSource']): string {
  if (source === 'dianping') return '大众点评';
  if (source === 'diaoyu') return '钓鱼之家';
  if (source === 'kklure') return '路亚塘';
  return '公开资料';
}

export function venueLinkLabel(source?: FishingVenue['catalogSource']): string {
  if (source === 'dianping') return '打开点评';
  if (source === 'diaoyu') return '打开钓场';
  if (source === 'kklure') return '打开路亚塘';
  return '打开资料';
}

export function venueKindIcon(venue: Pick<FishingVenue, 'kind' | 'status' | 'imageUrl'>): string {
  if (venue.imageUrl) return venue.imageUrl;
  return venueKindDataUri(venue.kind, venue.status);
}

export const VENUE_LOGO_AVATAR = '/logo.svg';
export const SPOT_MARKER_SIZE = { w: 200, h: 82 };
export const SPOT_DOT_SIZE = { w: 32, h: 38 };
export const NEARBY_MAP_ZOOM = 14;
export const SPOT_PLATE_MIN_ZOOM = 13;

export function showSpotPlate(zoom: number): boolean {
  return zoom >= SPOT_PLATE_MIN_ZOOM;
}

export type SpotMarkerTone = 'lure' | 'sea' | 'pond';

export function venueAvatar(photoUrl?: string): string {
  return photoUrl || VENUE_LOGO_AVATAR;
}

export function venueMarkerTone(kind: string): SpotMarkerTone {
  if (kind.includes('海钓')) return 'sea';
  if (kind.includes('路亚')) return 'lure';
  return 'pond';
}

export function venueMarkerKindLabel(tone: SpotMarkerTone): string {
  if (tone === 'sea') return '海钓';
  if (tone === 'pond') return '池塘';
  return '路亚';
}

export function venuePinHtml(venue: FishingVenue, score: number | null = null, photoUrl?: string): string {
  const tone = venueMarkerTone(venue.kind);
  const kindLabel = venueMarkerKindLabel(tone);
  const fresh = score == null ? '<em class="spot-marker-new">新</em>' : '';
  const avatar = venueAvatar(photoUrl);
  const where = venue.addressHint ? `${venue.district} · ${venue.addressHint}` : venue.district;
  const info = `${where} · ${venue.feeLabel} · ${venue.statusLabel}`;
  return `<div class="spot-marker" data-tone="${tone}" data-empty="${score == null ? 'true' : 'false'}" data-status="${escapeHtml(venue.status)}" title="${escapeHtml(venue.name)}"><div class="spot-marker-plate"><span class="spot-marker-avatar" data-logo="${photoUrl ? 'false' : 'true'}"><img src="${escapeHtml(avatar)}" alt=""></span><div class="spot-marker-copy"><strong class="spot-marker-name">${escapeHtml(venue.name)}</strong><div class="spot-marker-meta">${starsHtml(score)}${fresh}<b class="spot-marker-kind">${kindLabel}</b></div><p class="spot-marker-info">${escapeHtml(info)}</p></div></div></div>`;
}

export function venueDotHtml(venue: FishingVenue, photoUrl?: string): string {
  const avatar = venueAvatar(photoUrl);
  return `<div class="spot-dot" data-logo="${photoUrl ? 'false' : 'true'}" title="${escapeHtml(venue.name)}"><img src="${escapeHtml(avatar)}" alt=""></div>`;
}

export function venueCaptionHtml(venue: FishingVenue): string {
  const where = venue.addressHint ? `${venue.district} · ${venue.addressHint}` : venue.district;
  const img = venueKindIcon(venue);
  return `<div class="map-bubble venue-bubble">
    <img class="venue-bubble-img" src="${escapeHtml(img)}" alt="${escapeHtml(venue.name)}" width="240" height="110" style="width:240px;height:110px;object-fit:cover;display:block;border-radius:8px;background:#0b2a32" />
    <p class="map-bubble-main">${escapeHtml(venue.name)}</p>
    <p class="map-bubble-meta">${escapeHtml(venue.feeLabel)} · ${escapeHtml(venue.kind)}</p>
    <p class="map-bubble-meta">${escapeHtml(where)}</p>
    <p class="map-bubble-meta">${escapeHtml(venueSourceLabel(venue.catalogSource))} · ${escapeHtml(venue.statusLabel)}</p>
    <div class="map-nav-actions">
      <button type="button" data-nav="car" data-vid="${escapeHtml(venue.id)}">驾车路线</button>
      <button type="button" data-nav="walk" data-vid="${escapeHtml(venue.id)}">步行路线</button>
      <button type="button" data-nav="open" data-vid="${escapeHtml(venue.id)}">打开高德导航</button>
    </div>
  </div>`;
}

export type VenueKindFilter = 'all' | 'lure' | 'pond' | 'sea';
export type VenueSort = 'score' | 'near';

export type VenueFilterInput = {
  query?: string;
  kind?: VenueKindFilter;
  openOnly?: boolean;
  sort?: VenueSort;
  from?: { lat: number; lon: number };
};

export function filterVenues(
  venues: FishingVenue[],
  reviews: SpotReview[],
  input: VenueFilterInput = {},
): FishingVenue[] {
  let rows = searchVenues(rankVenues(venues, reviews), input.query ?? '');
  if (input.kind && input.kind !== 'all') {
    rows = rows.filter((venue) => venueMarkerTone(venue.kind) === input.kind);
  }
  if (input.openOnly) {
    rows = rows.filter((venue) => venue.status === 'open');
  }
  if (input.sort === 'near' && input.from) {
    const from = input.from;
    return [...rows].sort((a, b) => distanceKm(from, a) - distanceKm(from, b));
  }
  return rows;
}

export function nearbyVenues(current: FishingVenue, all: FishingVenue[], limit = 3): FishingVenue[] {
  return [...all]
    .filter((row) => row.id !== current.id)
    .sort((a, b) => distanceKm(current, a) - distanceKm(current, b))
    .slice(0, Math.max(0, limit));
}

export const NEARBY_POND_LIMIT = 8;

export function nearbyPonds(
  from: { lat: number; lon: number },
  venues: FishingVenue[],
  limit = NEARBY_POND_LIMIT,
): FishingVenue[] {
  return [...venues]
    .filter((row) => venueMarkerTone(row.kind) === 'pond')
    .sort((a, b) => distanceKm(from, a) - distanceKm(from, b))
    .slice(0, Math.max(0, limit));
}

function bareVenueName(name: string): string {
  return name.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim();
}

export function catchesForVenue(venue: FishingVenue, reports: CatchReport[]): CatchReport[] {
  const name = venue.name.trim();
  const bare = bareVenueName(name);
  const road = venue.addressHint.trim();
  return reports.filter((row) => {
    const spot = row.spotName.trim();
    if (!spot) return false;
    if (name.includes(spot) || spot.includes(name)) return true;
    if (bare && (bare.includes(spot) || spot.includes(bare))) return true;
    if (road && (road === spot || road.includes(spot) || spot.includes(road))) return true;
    return false;
  });
}

export function venueDistanceLabel(venue: Pick<FishingVenue, 'lat' | 'lon'>, fromLat: number, fromLon: number): string {
  return formatDistanceKm(distanceKm({ lat: fromLat, lon: fromLon }, venue));
}
