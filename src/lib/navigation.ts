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
