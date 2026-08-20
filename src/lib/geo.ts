export type GeoFix = { lat: number; lon: number };

export type GeoErrorInput = {
  supported: boolean;
  secure: boolean;
  code?: number;
};

export function geoErrorMessage(input: GeoErrorInput): string {
  if (!input.supported) return '这台设备不支持定位，仍用上海中心';
  if (!input.secure) return '手机定位需要 HTTPS 或本机打开。当前页面不安全，仍用上海中心';
  if (input.code === 1) return '定位被拒绝，请允许浏览器使用位置，仍用上海中心';
  if (input.code === 2) return '暂时拿不到位置，仍用上海中心';
  if (input.code === 3) return '定位超时，仍用上海中心';
  return '定位失败，仍用上海中心';
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 30000,
};

const EARTH_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceKm(a: GeoFix, b: GeoFix): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 0.05) return '附近';
  if (km < 1) return `${Math.round(km * 1000)}米`;
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}公里` : `${rounded.toFixed(1)}公里`;
}

export function requestCurrentPosition(): Promise<GeoFix> {
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const secure = typeof window === 'undefined' ? true : window.isSecureContext;
  if (!supported || !secure) {
    return Promise.reject(new Error(geoErrorMessage({ supported, secure })));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(geoErrorMessage({ supported: true, secure: true, code: err.code }))),
      GEO_OPTIONS,
    );
  });
}
