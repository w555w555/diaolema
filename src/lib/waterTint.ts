import type { WaterTint } from '../types';

export type { WaterTint };

export function inferWaterTint(input: {
  precipNowMm: number;
  precip6hMm: number;
  precip24hMm: number;
  weatherCode: number;
}): { tint: WaterTint; note: string } {
  const storm = input.weatherCode >= 95 || input.weatherCode === 65 || input.weatherCode === 81;
  const rain6 = Math.max(input.precip6hMm, input.precipNowMm);
  const rain24 = Math.max(input.precip24hMm, rain6);
  const rainingNow =
    input.precipNowMm > 0.2 ||
    (input.weatherCode >= 51 && input.weatherCode <= 67) ||
    (input.weatherCode >= 80 && input.weatherCode <= 82);

  if (storm || rain24 >= 8 || rain6 >= 5) {
    return { tint: '浑浊', note: '经验：近时降水较多，水色常浑，不是测站' };
  }
  if (rain6 >= 1 || rain24 >= 3 || rainingNow) {
    return { tint: '微浑', note: '经验：有降水或刚下过，水色常微浑，不是测站' };
  }
  return { tint: '偏清', note: '经验：近时少雨，水色常偏清，不是测站' };
}

export function visibilityLabel(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  if (meters >= 10000) return `${(meters / 1000).toFixed(0)} km`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function uvLabel(uv: number | null | undefined): string {
  if (uv == null || !Number.isFinite(uv)) return '—';
  return uv.toFixed(1);
}
