import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import AMapLoader from '@amap/amap-jsapi-loader';
import 'leaflet/dist/leaflet.css';
import { AMAP_RASTER_SUBDOMAINS, AMAP_RASTER_URL, readAmapConfig } from '../lib/mapConfig';
import { buildAmapNavUrl, type NavMode } from '../lib/navigation';
import {
  NEARBY_MAP_ZOOM,
  SPOT_DOT_SIZE,
  SPOT_MARKER_SIZE,
  showSpotPlate,
  venueDotHtml,
  venuePinHtml,
  searchVenues,
} from '../lib/venues';
import { coverPhotoForVenue, scoreForVenue } from '../lib/spotScore';
import type { FishingVenue, SpotReview } from '../types';

export type MapEngine = 'loading' | 'amap' | 'leaflet';

export type NavPlace = { lon: number; lat: number; name: string };

type Props = {
  venues?: FishingVenue[];
  reviews?: SpotReview[];
  lat: number;
  lon: number;
  locateVisit?: number;
  locating?: boolean;
  visible?: boolean;
  picking?: boolean;
  onPick?: (lat: number, lon: number) => void;
  navigateTo?: NavPlace | null;
  onNavigateDone?: () => void;
  focusVenue?: FishingVenue | null;
  onFocusDone?: () => void;
  onOpenVenue?: (venue: FishingVenue) => void;
  onOpenList?: () => void;
};

type NavApi = {
  preview: (place: NavPlace, mode: NavMode) => void;
  open: (place: NavPlace, mode: NavMode) => void;
};

type ViewApi = {
  setNearby: (lat: number, lon: number) => void;
};

export function CatchMap({
  venues = [],
  reviews = [],
  lat,
  lon,
  locateVisit = 0,
  locating,
  visible = true,
  picking,
  onPick,
  navigateTo,
  onNavigateDone,
  focusVenue,
  onFocusDone,
  onOpenVenue,
  onOpenList,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pickRef = useRef({ picking, onPick });
  pickRef.current = { picking, onPick };
  const reviewsRef = useRef(reviews);
  reviewsRef.current = reviews;
  const openVenueRef = useRef(onOpenVenue);
  openVenueRef.current = onOpenVenue;
  const originRef = useRef({ lat, lon });
  originRef.current = { lat, lon };
  const navApi = useRef<NavApi | null>(null);
  const focusApi = useRef<((venue: FishingVenue) => void) | null>(null);
  const viewApi = useRef<ViewApi | null>(null);
  const [engine, setEngine] = useState<MapEngine>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [navMsg, setNavMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const hits = query.trim() ? searchVenues(venues, query).slice(0, 8) : [];

  const markerHtml = (venue: FishingVenue, zoom: number) => {
    const photo = coverPhotoForVenue(venue.id, reviewsRef.current);
    const score = scoreForVenue(venue.id, reviewsRef.current);
    return showSpotPlate(zoom) ? venuePinHtml(venue, score, photo) : venueDotHtml(venue, photo);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let cancelled = false;
    let cleanup = () => {};

    const start = async () => {
      const origin = originRef.current;
      const baked = readAmapConfig({
        VITE_AMAP_KEY: import.meta.env.VITE_AMAP_KEY,
        VITE_AMAP_SECURITY_CODE: import.meta.env.VITE_AMAP_SECURITY_CODE,
      });
      let key = baked.key;
      let security = baked.security;
      if (!key) {
        try {
          const res = await fetch('/api/map-config');
          const remote = res.ok ? ((await res.json()) as { key?: string; security?: string }) : null;
          key = remote?.key?.trim() || '';
          security = remote?.security?.trim() || security;
        } catch {
          /* 仍走降级底图 */
        }
      }
      if (key) {
        try {
          if (security) {
            window._AMapSecurityConfig = {
              securityJsCode: security,
            };
          }
          const AMap = await AMapLoader.load({
            key,
            version: '2.0',
            plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation', 'AMap.Driving', 'AMap.Walking'],
          });
          if (cancelled) return;
          const map = new AMap.Map(el, {
            viewMode: '2D',
            zoom: NEARBY_MAP_ZOOM,
            center: [origin.lon, origin.lat],
            dragEnable: true,
            zoomEnable: true,
            keyboardEnable: true,
            mapStyle: 'amap://styles/normal',
          });
          map.setFeatures(['bg', 'road', 'building']);
          map.addControl(new AMap.Scale());
          map.addControl(new AMap.ToolBar({ position: 'RT' }));
          map.addControl(
            new AMap.Geolocation({
              enableHighAccuracy: true,
              timeout: 10000,
              buttonPosition: 'RB',
              showButton: true,
              showMarker: true,
              showCircle: true,
              panToLocation: true,
              zoomToAccuracy: true,
            }),
          );
          let driving: {
            search: (from: number[], to: number[], cb: (status: string, result: { info?: string }) => void) => void;
            clear: () => void;
          } | null = null;
          let walking: {
            search: (from: number[], to: number[], cb: (status: string, result: { info?: string }) => void) => void;
            clear: () => void;
          } | null = null;
          try {
            driving = new AMap.Driving({ map, hideMarkers: false, showTraffic: false });
            walking = new AMap.Walking({ map, hideMarkers: false });
          } catch (pluginErr) {
            setMapError(pluginErr instanceof Error ? pluginErr.message : '路线规划插件未开通');
          }

          const api: NavApi = {
            preview(place, mode) {
              const startAt = originRef.current;
              const startLngLat = [startAt.lon, startAt.lat];
              const endLngLat = [place.lon, place.lat];
              driving?.clear?.();
              walking?.clear?.();
              setNavMsg(`正在规划到${place.name}的${mode === 'walk' ? '步行' : '驾车'}路线…`);
              const planner = mode === 'walk' ? walking : driving;
              if (!planner) {
                api.open(place, mode);
                return;
              }
              planner.search(startLngLat, endLngLat, (status: string, result: { info?: string }) => {
                if (status === 'complete') {
                  setNavMsg(`已画出到${place.name}的路线，可再点「打开高德导航」`);
                  map.setFitView();
                } else {
                  setNavMsg(`地图内路线失败（${result?.info ?? status}），改为打开高德导航`);
                  api.open(place, mode);
                }
              });
            },
            open(place, mode) {
              const startAt = originRef.current;
              const url = buildAmapNavUrl({
                fromLon: startAt.lon,
                fromLat: startAt.lat,
                fromName: '我的位置',
                toLon: place.lon,
                toLat: place.lat,
                toName: place.name,
                mode,
              });
              window.open(url, '_blank', 'noopener,noreferrer');
              setNavMsg(`已打开高德导航：前往${place.name}`);
            },
          };
          navApi.current = api;
          focusApi.current = (venue) => {
            map.setZoom(NEARBY_MAP_ZOOM);
            map.setCenter([venue.lon, venue.lat]);
            openVenueRef.current?.(venue);
          };
          viewApi.current = {
            setNearby(nextLat, nextLon) {
              map.resize();
              map.setZoom(NEARBY_MAP_ZOOM);
              map.setCenter([nextLon, nextLat]);
            },
          };

          const amapMarkers: { venue: FishingVenue; marker: { setContent: (html: string) => void; setOffset: (px: unknown) => void } }[] =
            [];
          const applyZoomStyle = () => {
            const zoom = map.getZoom();
            const detailed = showSpotPlate(zoom);
            const size = detailed ? SPOT_MARKER_SIZE : SPOT_DOT_SIZE;
            for (const row of amapMarkers) {
              row.marker.setContent(markerHtml(row.venue, zoom));
              row.marker.setOffset(new AMap.Pixel(-size.w / 2, -size.h));
            }
          };

          for (const venue of venues) {
            const zoom = map.getZoom();
            const detailed = showSpotPlate(zoom);
            const size = detailed ? SPOT_MARKER_SIZE : SPOT_DOT_SIZE;
            const marker = new AMap.Marker({
              position: [venue.lon, venue.lat],
              content: markerHtml(venue, zoom),
              offset: new AMap.Pixel(-size.w / 2, -size.h),
              zIndex: 120,
            });
            marker.on('click', () => openVenueRef.current?.(venue));
            map.add(marker);
            amapMarkers.push({ venue, marker });
          }
          map.on('zoomend', applyZoomStyle);
          map.on('click', (e: { lnglat: { getLat: () => number; getLng: () => number } }) => {
            if (!pickRef.current.picking) return;
            pickRef.current.onPick?.(e.lnglat.getLat(), e.lnglat.getLng());
          });
          if (cancelled) {
            map.destroy();
            return;
          }
          setEngine('amap');
          setMapError(null);
          cleanup = () => {
            navApi.current = null;
            focusApi.current = null;
            viewApi.current = null;
            map.destroy();
          };
          return;
        } catch (err) {
          if (cancelled) return;
          setMapError(err instanceof Error ? err.message : '高德 SDK 加载失败');
        }
      }

      const map = L.map(el, { zoomControl: true }).setView([origin.lat, origin.lon], NEARBY_MAP_ZOOM);
      L.tileLayer(AMAP_RASTER_URL, {
        subdomains: AMAP_RASTER_SUBDOMAINS,
        maxZoom: 18,
        attribution: '高德 · 演示底图',
      }).addTo(map);
      const api: NavApi = {
        preview(place, mode) {
          api.open(place, mode);
        },
        open(place, mode) {
          const startAt = originRef.current;
          window.open(
            buildAmapNavUrl({
              fromLon: startAt.lon,
              fromLat: startAt.lat,
              fromName: '我的位置',
              toLon: place.lon,
              toLat: place.lat,
              toName: place.name,
              mode,
            }),
            '_blank',
            'noopener,noreferrer',
          );
          setNavMsg(`已打开高德导航：前往${place.name}`);
        },
      };
      navApi.current = api;
      focusApi.current = (venue) => {
        map.setView([venue.lat, venue.lon], NEARBY_MAP_ZOOM);
        openVenueRef.current?.(venue);
      };
      viewApi.current = {
        setNearby(nextLat, nextLon) {
          map.invalidateSize();
          map.setView([nextLat, nextLon], NEARBY_MAP_ZOOM);
        },
      };
      const leafletMarkers: { venue: FishingVenue; marker: L.Marker }[] = [];
      const leafletIcon = (venue: FishingVenue, zoom: number) => {
        const detailed = showSpotPlate(zoom);
        const size = detailed ? SPOT_MARKER_SIZE : SPOT_DOT_SIZE;
        return L.divIcon({
          className: 'leaflet-score-wrap',
          html: markerHtml(venue, zoom),
          iconSize: [size.w, size.h],
          iconAnchor: [size.w / 2, size.h],
        });
      };
      const applyZoomStyle = () => {
        const zoom = map.getZoom();
        for (const row of leafletMarkers) {
          row.marker.setIcon(leafletIcon(row.venue, zoom));
        }
      };
      for (const venue of venues) {
        const marker = L.marker([venue.lat, venue.lon], {
          icon: leafletIcon(venue, map.getZoom()),
          zIndexOffset: 120,
        });
        marker.on('click', () => openVenueRef.current?.(venue));
        marker.addTo(map);
        leafletMarkers.push({ venue, marker });
      }
      map.on('zoomend', applyZoomStyle);
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!pickRef.current.picking) return;
        pickRef.current.onPick?.(e.latlng.lat, e.latlng.lng);
      });
      if (cancelled) {
        map.remove();
        return;
      }
      setEngine('leaflet');
      cleanup = () => {
        navApi.current = null;
        focusApi.current = null;
        viewApi.current = null;
        map.remove();
      };
    };

    void start();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [venues, reviews]);

  useEffect(() => {
    if (!navigateTo || !navApi.current) return;
    navApi.current.preview(navigateTo, 'car');
    onNavigateDone?.();
  }, [navigateTo, onNavigateDone]);

  useEffect(() => {
    if (!focusVenue || engine === 'loading' || !focusApi.current) return;
    focusApi.current(focusVenue);
    onFocusDone?.();
  }, [focusVenue, engine, onFocusDone]);

  useEffect(() => {
    if (!visible || engine === 'loading' || !viewApi.current) return;
    const id = window.setTimeout(() => viewApi.current?.setNearby(lat, lon), 120);
    return () => window.clearTimeout(id);
  }, [visible, engine, lat, lon]);

  useEffect(() => {
    if (!locateVisit || engine === 'loading' || !viewApi.current) return;
    viewApi.current.setNearby(lat, lon);
  }, [locateVisit, lat, lon, engine]);

  return (
    <div className="map-wrap">
      <div ref={rootRef} className="map-canvas" />
      <div className="map-search-wrap">
        <input
          className="map-search"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder="搜索钓场、区县、路名"
        />
        {hits.length > 0 ? (
          <ul className="map-search-hits">
            {hits.map((venue) => (
              <li key={venue.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    if (focusApi.current) focusApi.current(venue);
                    else onOpenVenue?.(venue);
                  }}
                >
                  <strong>{venue.name}</strong>
                  <span>
                    {venue.district}
                    {venue.addressHint ? ` · ${venue.addressHint}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {query.trim() && hits.length === 0 ? <p className="map-search-empty">没有匹配的钓场</p> : null}
      </div>
      <div className={`map-status ${engine}`}>
        {engine === 'loading' && '正在加载地图…'}
        {engine === 'amap' && (locating ? '正在定位附近钓场…' : '高德已开启 · 已对准附近钓场')}
        {engine === 'leaflet' &&
          (mapError
            ? `高德未开启：${mapError}，已用演示底图`
            : locating
              ? '正在定位附近钓场…'
              : '演示底图 · 已对准附近钓场')}
      </div>
      {onOpenList ? (
        <button type="button" className="map-list-btn" onClick={onOpenList}>
          钓场
        </button>
      ) : null}
      {navMsg && <div className="map-banner pick">{navMsg}</div>}
      {picking && <div className="map-banner pick">点击地图选择上报钓点</div>}
    </div>
  );
}
