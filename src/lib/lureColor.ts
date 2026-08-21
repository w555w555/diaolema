/**
 * 路亚饵色：按对象鱼 × 水色加权。表在 src/data/lure-colors.json，
 * Postgres 同源见 supabase/lure_colors.sql。运行时读 JSON，不联网。
 * 不是溶氧、不是开口实测。
 */
import type { SightedWater, WaterTint } from '../types';
import raw from '../data/lure-colors.json';
import { rainTintToGuess } from './sightedWater';

export const LURE_COLOR_FAMILIES = ['银白', '红头金', '草黄', '暗色', '橙红'] as const;
export type LureColorFamily = (typeof LURE_COLOR_FAMILIES)[number];

type Mix = Partial<Record<LureColorFamily, number>>;
type WaterMix = Record<SightedWater, Mix>;

type LureColorFile = {
  disclaimer: string;
  updatedAt: string;
  families: Record<LureColorFamily, string>;
  default: WaterMix;
  fish: Record<string, WaterMix>;
};

const file = raw as LureColorFile;

export const LURE_COLOR_SWATCH: Record<LureColorFamily, string> = file.families;
export const LURE_COLOR_DISCLAIMER = file.disclaimer;
export const LURE_COLOR_UPDATED_AT = file.updatedAt;

export type LureColorRank = {
  family: LureColorFamily;
  score: number;
  swatch: string;
};

export type LureColorAdvice = {
  water: SightedWater;
  fromSight: boolean;
  night: boolean;
  ranked: LureColorRank[];
};

export type LureColorSeedRow = {
  fish: string;
  water: SightedWater;
  family: LureColorFamily;
  weight: number;
};

const WATERS: SightedWater[] = ['清澈', '微浑', '浑浊', '肥水'];

function isFamily(value: string): value is LureColorFamily {
  return (LURE_COLOR_FAMILIES as readonly string[]).includes(value);
}

function flatten(fish: string, block: WaterMix): LureColorSeedRow[] {
  const rows: LureColorSeedRow[] = [];
  for (const water of WATERS) {
    const mix = block[water] ?? {};
    for (const family of LURE_COLOR_FAMILIES) {
      const weight = mix[family];
      if (typeof weight === 'number' && weight > 0) {
        rows.push({ fish, water, family, weight });
      }
    }
  }
  return rows;
}

/** 与 Postgres lure_color_weights 同行：默认鱼名为 *。 */
export function lureColorSeedRows(): LureColorSeedRow[] {
  return [...flatten('*', file.default), ...Object.entries(file.fish).flatMap(([fish, block]) => flatten(fish, block))];
}

export function resolveLureWater(sighted: SightedWater | null, rainTint: WaterTint): {
  water: SightedWater;
  fromSight: boolean;
} {
  if (sighted) return { water: sighted, fromSight: true };
  return { water: rainTintToGuess(rainTint), fromSight: false };
}

function mixFor(fish: string, water: SightedWater): Mix {
  return file.fish[fish]?.[water] ?? file.default[water];
}

function withNight(mix: Mix, night: boolean): Mix {
  if (!night) return mix;
  return {
    银白: Math.round((mix.银白 ?? 0) * 0.35),
    红头金: Math.round((mix.红头金 ?? 0) * 0.45),
    草黄: Math.round((mix.草黄 ?? 0) * 0.35),
    暗色: (mix.暗色 ?? 0) + 32,
    橙红: (mix.橙红 ?? 0) + 38,
  };
}

function normalize(mix: Mix): LureColorRank[] {
  const total = LURE_COLOR_FAMILIES.reduce((sum, key) => sum + (mix[key] ?? 0), 0);
  if (total <= 0) return [{ family: '银白', score: 100, swatch: LURE_COLOR_SWATCH.银白 }];
  return LURE_COLOR_FAMILIES.map((family) => ({
    family,
    score: Math.round(((mix[family] ?? 0) / total) * 100),
    swatch: LURE_COLOR_SWATCH[family],
  }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family, 'zh'));
}

export function recommendLureColors(input: {
  fish: string;
  sighted: SightedWater | null;
  rainTint: WaterTint;
  night?: boolean;
}): LureColorAdvice {
  const { water, fromSight } = resolveLureWater(input.sighted, input.rainTint);
  const night = Boolean(input.night);
  const ranked = normalize(withNight(mixFor(input.fish, water), night));
  return { water, fromSight, night, ranked };
}

export function topLureColorFamily(input: {
  fish: string;
  sighted: SightedWater | null;
  rainTint: WaterTint;
  night?: boolean;
}): LureColorFamily {
  return recommendLureColors(input).ranked[0]?.family ?? '银白';
}

/** 把色族落到拟饵文案：银白用清水名，红头金用浊水名。 */
export function paintByFamily(
  family: LureColorFamily,
  labels: { clear: string; stained: string; green?: string; dark?: string; glow?: string },
): string {
  if (family === '草黄') return labels.green ?? '草黄/图表绿';
  if (family === '红头金') return labels.stained;
  if (family === '暗色') return labels.dark ?? '暗色';
  if (family === '橙红') return labels.glow ?? '橙红';
  return labels.clear;
}

export function lureColorWhy(advice: LureColorAdvice, fish: string): string {
  const top = advice.ranked[0];
  const waterBit = advice.fromSight ? `目测${advice.water}` : `未目测按降水算${advice.water}`;
  const nightBit = advice.night ? '夜钓抬暗色/橙红。' : '';
  return `饵色：${fish}×${waterBit}→${top?.family ?? '银白'} ${top?.score ?? 0}分。${nightBit}经验，不是开口实测。`;
}

export function isLureColorFamily(value: string): value is LureColorFamily {
  return isFamily(value);
}
