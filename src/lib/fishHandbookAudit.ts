import type { FishStyle, WaterLayer, WeatherSnapshot } from '../types';
import { buildAdvice } from './advice';
import { FISH_CATALOG, FISH_METHODS, type CatalogFish } from './fishId/catalog';
import { fishGuide } from './fishGuide';
import { FISH_HANDBOOK, handbookOf, layerRank, type FishHandbook } from './fishHandbook';
import { layerStance } from './homeView';

export type AuditCase = {
  id: string;
  at: Date;
  weather: Partial<WeatherSnapshot>;
};

export type AuditRow = {
  fish: CatalogFish;
  style: FishStyle;
  caseId: string;
  layer: WaterLayer;
  stance: string;
  method: string;
  bait: string;
  ok: boolean;
  mismatches: string[];
};

function snap(partial: Partial<WeatherSnapshot>): WeatherSnapshot {
  return {
    at: '2026-08-17T12:00:00+08:00',
    lat: 31.23,
    lon: 121.47,
    temperatureC: 26,
    apparentC: 27,
    humidityPct: 70,
    pressureHpa: 1015,
    pressureDelta3h: 0.2,
    windKmh: 10,
    windDirDeg: 90,
    precipitationMm: 0,
    weatherCode: 1,
    cloudPct: 40,
    ...partial,
  };
}

/** 覆盖建议引擎全部气象检索键。 */
export const AUDIT_CASES: AuditCase[] = [
  { id: '盛夏正午', at: new Date('2026-08-17T12:00:00+08:00'), weather: { temperatureC: 33 } },
  {
    id: '高压走稳',
    at: new Date('2026-08-17T06:00:00+08:00'),
    weather: { temperatureC: 22, pressureHpa: 1024, pressureDelta3h: 0.1 },
  },
  {
    id: '气压急降',
    at: new Date('2026-08-17T06:00:00+08:00'),
    weather: { temperatureC: 27, pressureDelta3h: -2.4 },
  },
  {
    id: '低压',
    at: new Date('2026-08-17T14:00:00+08:00'),
    weather: { temperatureC: 24, pressureHpa: 1005, pressureDelta3h: 0 },
  },
  { id: '默认', at: new Date('2026-08-17T12:00:00+08:00'), weather: { temperatureC: 26, pressureHpa: 1015 } },
  {
    id: '有雨',
    at: new Date('2026-08-17T12:00:00+08:00'),
    weather: { temperatureC: 26, precipitationMm: 1.2, weatherCode: 61 },
  },
  { id: '夜钓', at: new Date('2026-08-17T21:00:00+08:00'), weather: { temperatureC: 24 } },
];

function hitKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((word) => text.includes(word));
}

function mismatchesFor(
  book: FishHandbook,
  style: FishStyle,
  layer: WaterLayer,
  stance: string,
  method: string,
  bait: string,
  guideLayer: string,
): string[] {
  const mismatches: string[] = [];
  if (guideLayer !== book.habitLayer) {
    mismatches.push(`词条水层 ${guideLayer} ≠ 手册 ${book.habitLayer}`);
  }
  if (book.layerFloor && layerRank(layer) < layerRank(book.layerFloor)) {
    mismatches.push(`算出 ${layer} 低于下限 ${book.layerFloor}`);
  }
  for (const word of book.forbidStance) {
    if (stance.includes(word) || method.includes(word)) {
      mismatches.push(`出现禁止文案「${word}」：${stance} / ${method}`);
    }
  }
  if (style === '路亚' && book.lureKeywords.length && !hitKeyword(bait, book.lureKeywords)) {
    mismatches.push(`拟饵未命中 ${book.lureKeywords.join('/')}：${bait}`);
  }
  if (style === '台钓' && book.baitKeywords.length && !hitKeyword(bait, book.baitKeywords)) {
    mismatches.push(`饵形未命中 ${book.baitKeywords.join('/')}：${bait}`);
  }
  return mismatches;
}

export function auditFishCase(fish: CatalogFish, style: FishStyle, auditCase: AuditCase): AuditRow {
  const book = FISH_HANDBOOK[fish];
  const advice = buildAdvice(snap(auditCase.weather), auditCase.at, { targetFish: fish, style });
  const bait = style === '路亚' ? advice.lure : `${advice.baitLabel} ${advice.baits.join(' ')}`;
  const stance = layerStance(advice.layer, style);
  const guideLayer = fishGuide(fish).habitLayer;
  const mismatches = mismatchesFor(book, style, advice.layer, stance, advice.method, bait, guideLayer);
  return {
    fish,
    style,
    caseId: auditCase.id,
    layer: advice.layer,
    stance,
    method: advice.method,
    bait,
    ok: mismatches.length === 0,
    mismatches,
  };
}

export function auditFishStyle(fish: string, style: FishStyle): AuditRow[] {
  const key = FISH_CATALOG.find((row) => row === fish);
  if (!key || !FISH_METHODS[key].includes(style)) return [];
  return AUDIT_CASES.map((row) => auditFishCase(key, style, row));
}

export function auditHandbook(): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const fish of FISH_CATALOG) {
    for (const style of FISH_METHODS[fish]) {
      for (const auditCase of AUDIT_CASES) {
        rows.push(auditFishCase(fish, style, auditCase));
      }
    }
  }
  return rows;
}

export function auditSummary(rows: AuditRow[] = auditHandbook()): {
  total: number;
  passed: number;
  failed: number;
  failures: AuditRow[];
} {
  const failures = rows.filter((row) => !row.ok);
  return { total: rows.length, passed: rows.length - failures.length, failed: failures.length, failures };
}

export function handbookSources(name: string): string[] {
  return handbookOf(name)?.sources ?? [];
}
