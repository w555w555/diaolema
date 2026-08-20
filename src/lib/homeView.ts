import type { WaterLayer } from '../types';

const RING = 2 * Math.PI * 58;

export function layerBand(layer: WaterLayer): '上' | '中' | '底' {
  if (layer === '底层') return '底';
  if (layer === '中下层') return '中';
  return '上';
}

export function layerStance(layer: WaterLayer): string {
  if (layer === '底层') return '守底';
  if (layer === '中下层') return '搜中下';
  if (layer === '中上层') return '搜中上';
  return '打上层';
}

export function flavorSliderPct(flavor: string): number {
  if (flavor.includes('大腥')) return 10;
  if (flavor.includes('腥香')) return 28;
  if (flavor.includes('香腥')) return 50;
  if (flavor.includes('清香')) return 72;
  if (flavor.includes('清淡')) return 88;
  return 50;
}

export function precipWetDry(precipitationMm: number, weatherCode: number): '干' | '有雨' {
  if (precipitationMm > 0.2 || (weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82) || weatherCode >= 95) {
    return '有雨';
  }
  return '干';
}

export function pressureTrend(deltaHpa: number): string {
  const abs = Math.abs(deltaHpa);
  if (abs < 0.5) return '走稳';
  if (deltaHpa <= -1.5) return '急降';
  if (deltaHpa < 0) return '缓降';
  if (deltaHpa >= 1.5) return '急升';
  return '缓升';
}

export function indexRingOffset(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return RING * (1 - clamped / 100);
}

export function hourBarHeights(temps: number[]): number[] {
  if (!temps.length) return [];
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);
  return temps.map((t) => 28 + ((t - min) / span) * 72);
}

export function windowNowPct(at: Date): number {
  const minutes = at.getHours() * 60 + at.getMinutes();
  return (minutes / (24 * 60)) * 100;
}

export const INDEX_RING_LEN = RING;
