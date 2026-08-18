export type NavMode = 'car' | 'walk' | 'ride';

export function buildAmapNavUrl(params: {
  fromLon: number;
  fromLat: number;
  fromName?: string;
  toLon: number;
  toLat: number;
  toName: string;
  mode?: NavMode;
}): string {
  const mode = params.mode ?? 'car';
  const fromName = encodeURIComponent(params.fromName ?? '我的位置');
  const toName = encodeURIComponent(params.toName);
  return [
    'https://uri.amap.com/navigation',
    `?from=${params.fromLon},${params.fromLat},${fromName}`,
    `&to=${params.toLon},${params.toLat},${toName}`,
    `&mode=${mode}`,
    '&coordinate=gaode',
    '&callnative=1',
  ].join('');
}

export function buildAmapOpenUrl(lon: number, lat: number, name = '附近钓场'): string {
  return [
    'https://uri.amap.com/marker',
    `?position=${lon},${lat}`,
    `&name=${encodeURIComponent(name)}`,
    '&src=yujian',
    '&coordinate=gaode',
    '&callnative=1',
  ].join('');
}

/** 手机上优先用真链接；程序里 window.open 常被拦截，失败再整页跳转。 */
export function openAmapNav(params: Parameters<typeof buildAmapNavUrl>[0]): void {
  const url = buildAmapNavUrl(params);
  const opened = typeof window !== 'undefined' ? window.open(url, '_blank') : null;
  if (opened) return;
  if (typeof window !== 'undefined') window.location.assign(url);
}
