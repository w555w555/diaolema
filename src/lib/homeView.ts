import { SHANGHAI_CENTER, type WaterLayer } from '../types';

const RING = 2 * Math.PI * 58;

export type LayerBand = '上' | '中' | '底';

export function layerBand(layer: WaterLayer): LayerBand {
  if (layer === '底层') return '底';
  if (layer === '中下层' || layer === '中上层') return '中';
  return '上';
}

/** 鱼标在水层柱上的位置：上层靠顶，中下层在中档下沿，底层贴底。 */
export function layerMarkerPct(layer: WaterLayer): number {
  if (layer === '上层') return 14;
  if (layer === '中上层') return 38;
  if (layer === '中下层') return 64;
  return 88;
}

export function layerStance(layer: WaterLayer, style?: '台钓' | '路亚'): string {
  if (layer === '底层') return style === '路亚' ? '搜底层' : '守底';
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

export function weatherPointNote(lat: number, lon: number): string {
  const plaza =
    Math.abs(lat - SHANGHAI_CENTER.lat) < 1e-4 && Math.abs(lon - SHANGHAI_CENTER.lon) < 1e-4;
  if (plaza) return '人民广场网格 · 模式海平面 · 不是水体';
  return '该点上空模式气压 · 不是水温溶氧';
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

export function planFromLine(input: {
  style: string;
  fish: string;
  sightedWater: string | null;
  rainTint: string | null;
  tempC: number | null;
}): string {
  const water = input.sightedWater ? `目测${input.sightedWater}` : `未目测·降水${input.rainTint ?? '—'}`;
  const temp = input.tempC == null || !Number.isFinite(input.tempC) ? '' : ` · ${Math.round(input.tempC)}°`;
  return `由${input.style} · ${input.fish} · ${water}${temp}算出`;
}

export function outingShort(label: string): string {
  if (label === '很高' || label === '较高') return '宜出钓';
  if (label === '一般') return '可以出钓';
  if (label === '偏低') return '谨慎出钓';
  if (label === '不宜') return '不宜出钓';
  return label;
}

export type WhyRow = { k: string; v: string };
export type HomeTag = { text: string; kind: 'idx' | 'plus' | '' };

export function layerLead(fish: string, stance: string, layer: string, tip: string): string {
  const first = tip.replace(/\s+/g, ' ').trim();
  return `${fish}今日${stance}。经验主攻${layer}。${first}`;
}

export function layerWhyRows(input: {
  fish: string;
  habitat: string;
  layer: string;
  pressureHpa: number | null;
  deltaHpa: number | null;
  trend: string;
  precip: string;
  sightedWater: string | null;
}): WhyRow[] {
  const hpa = input.pressureHpa == null ? '—' : input.pressureHpa.toFixed(0);
  const low = input.pressureHpa != null && input.pressureHpa <= 1008;
  const delta =
    input.deltaHpa == null ? '—' : `${input.deltaHpa >= 0 ? '+' : ''}${input.deltaHpa.toFixed(1)}`;
  const rows: WhyRow[] = [
    { k: '鱼', v: `${input.fish}。${input.habitat}` },
    {
      k: '气压',
      v: `${hpa} hPa。低压检索线 ≤1008，现在${low ? '偏低，手册常搜中上' : '未到低压线，经验不抬层'}（不是溶氧）`,
    },
    {
      k: '趋势',
      v: `近 3 小时 ΔP ${delta} hPa。急降键 −1.5，现在${input.trend}，经验仍主攻${input.layer}`,
    },
    {
      k: '降水',
      v: input.precip === '有雨' ? '有雨。经验把水层抬一档，进水口优先。' : '干。有雨才会把水层抬一档；今天不抬。',
    },
  ];
  if (input.sightedWater) {
    rows.push({ k: '水色', v: `目测${input.sightedWater}，改饵色，不是溶氧。` });
  } else {
    rows.push({ k: '水色', v: '未目测，暂按降水推演，到塘后再点选。' });
  }
  return rows;
}

export function baitWhyRows(input: {
  style: string;
  flavor: string;
  form: string;
  lure: string;
  lureNote: string;
  method: string;
  tempC: number | null;
  lureColorWhy?: string;
}): WhyRow[] {
  const temp = input.tempC == null ? '—' : `${Math.round(input.tempC)}°C`;
  if (input.style === '路亚') {
    const rows: WhyRow[] = [
      { k: '气温', v: `${temp}。经验定拟饵色与操法，不是今日实测鱼口。` },
      { k: '拟饵', v: `${input.lure}。${input.lureNote}` },
    ];
    if (input.lureColorWhy) rows.push({ k: '饵色', v: input.lureColorWhy });
    rows.push({ k: '钓法', v: input.method });
    return rows;
  }
  return [
    { k: '气温', v: `${temp}。味型取${input.flavor}（经验，不是开口保证）。` },
    { k: '饵形', v: `${input.form}。钩要送到今日水层。` },
    { k: '钓法', v: input.method },
  ];
}

export function homeIndexTags(input: {
  score: number;
  label: string;
  reasons: string[];
  precip: string;
  wind: string;
}): HomeTag[] {
  const tags: HomeTag[] = [{ text: `钓鱼推荐指数 ${input.score} ${input.label}`, kind: 'idx' }];
  for (const reason of input.reasons.slice(0, 2)) {
    if (reason.includes('气温') && reason.includes('合适')) tags.push({ text: '气温适宜', kind: 'plus' });
    else if (reason.includes('晨昏')) tags.push({ text: '晨昏窗口', kind: 'plus' });
    else if (reason.includes('轻降水')) tags.push({ text: '有轻降水', kind: 'plus' });
  }
  tags.push({ text: `降水 ${input.precip === '有雨' ? '有雨' : '无雨'}`, kind: '' });
  tags.push({ text: `风向 ${input.wind}`, kind: '' });
  return tags.slice(0, 5);
}

export const INDEX_RING_LEN = RING;
