export type AmapPublicConfig = {
  key: string;
  security: string;
};

export function readAmapConfig(env: Record<string, string | undefined>): AmapPublicConfig {
  const key = (env.VITE_AMAP_KEY || env.AMAP_KEY || '').trim();
  const security = (env.VITE_AMAP_SECURITY_CODE || env.AMAP_SECURITY_CODE || '').trim();
  return { key, security };
}

/** 国内可显示的高德栅格底图（无 JS Key 时 Leaflet 降级，避免 OSM 空白） */
export const AMAP_RASTER_URL =
  'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
export const AMAP_RASTER_SUBDOMAINS = ['1', '2', '3', '4'];
