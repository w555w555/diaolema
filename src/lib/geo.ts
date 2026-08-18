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
