import type { FishIdResult, FishStyle } from '../../types';

export const UNCERTAIN = '不确定';

export const FISH_CATALOG = [
  '鲫鱼',
  '鲤鱼',
  '草鱼',
  '青鱼',
  '鳊鱼',
  '鲈鱼',
  '翘嘴',
  '白条',
  '黑鱼',
  '黄颡鱼',
  '罗非鱼',
  '鳜鱼',
  '黄鱼',
  '鲻鱼',
  '鲶鱼',
  '塘鲺',
  '鳡鱼',
  '红鳍鲌',
  '鲮鱼',
] as const;

export type CatalogFish = (typeof FISH_CATALOG)[number];

/**
 * 钓法归属编译自公开对象鱼文，运行时不联网。
 * 台钓：渔翁垂钓网/饵料网鲫鲤草青鳊罗非；黄颡手竿串钩（钓鱼人）；鲻鱼手竿商品饵，路亚效果差（酷钓鱼）。
 * 路亚：渔钓者/酷钓鱼黑鱼鳜鲈翘嘴鳡；红鳍鲌同鲌亚科；上海河道翘嘴鲈鳜（小浪纹）。
 * 兼钓：白条微物路亚+袖钩台钓；罗非台钓经典+南方微物；鲶/塘鲺软虫路亚+荤饵底钓。
 */
export const FISH_METHODS: Record<CatalogFish, readonly FishStyle[]> = {
  鲫鱼: ['台钓'],
  鲤鱼: ['台钓'],
  草鱼: ['台钓'],
  青鱼: ['台钓'],
  鳊鱼: ['台钓'],
  鲮鱼: ['台钓'],
  黄颡鱼: ['台钓'],
  黄鱼: ['台钓'],
  鲻鱼: ['台钓'],
  鲈鱼: ['路亚'],
  翘嘴: ['路亚'],
  黑鱼: ['路亚'],
  鳜鱼: ['路亚'],
  鳡鱼: ['路亚'],
  红鳍鲌: ['路亚'],
  白条: ['台钓', '路亚'],
  罗非鱼: ['台钓', '路亚'],
  鲶鱼: ['台钓', '路亚'],
  塘鲺: ['台钓', '路亚'],
};

export const DEFAULT_FISH: Record<FishStyle, CatalogFish> = {
  台钓: '鲫鱼',
  路亚: '翘嘴',
};

export function fishFitsStyle(fish: string, style: FishStyle): boolean {
  const methods = FISH_METHODS[fish as CatalogFish];
  return Boolean(methods?.includes(style));
}

export function catalogForStyle(style: FishStyle): CatalogFish[] {
  return FISH_CATALOG.filter((name) => FISH_METHODS[name].includes(style));
}

export function coerceFishForStyle(fish: string, style: FishStyle): CatalogFish {
  if (fishFitsStyle(fish, style)) return fish as CatalogFish;
  return DEFAULT_FISH[style];
}

const ALIASES: Record<string, CatalogFish> = {
  鳊: '鳊鱼',
  武昌鱼: '鳊鱼',
  长春鳊: '鳊鱼',
  乌鳢: '黑鱼',
  才鱼: '黑鱼',
  生鱼: '黑鱼',
  乌鱼: '黑鱼',
  黄辣丁: '黄颡鱼',
  黄骨鱼: '黄颡鱼',
  昂刺: '黄颡鱼',
  嘎鱼: '黄颡鱼',
  花鲈: '鲈鱼',
  七星鲈: '鲈鱼',
  海鲈: '鲈鱼',
  鲈: '鲈鱼',
  鳜: '鳜鱼',
  桂鱼: '鳜鱼',
  鳌花: '鳜鱼',
  翘嘴鲌: '翘嘴',
  白鱼: '翘嘴',
  餐条: '白条',
  青鳞: '白条',
  草鲩: '草鱼',
  鲩: '草鱼',
  青鲩: '青鱼',
  黑鲩: '青鱼',
  鲫: '鲫鱼',
  鲫瓜: '鲫鱼',
  喜头: '鲫鱼',
  鲤: '鲤鱼',
  塘虱: '塘鲺',
  鲶: '鲶鱼',
  鲮: '鲮鱼',
  红鲌: '红鳍鲌',
  罗非: '罗非鱼',
  福寿鱼: '罗非鱼',
  鲻: '鲻鱼',
  大黄鱼: '黄鱼',
  小黄鱼: '黄鱼',
};

function stripDecorations(raw: string): string {
  return raw
    .trim()
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/[幼成雌雄]/g, '')
    .trim();
}

export function normalizeFishName(raw: string | null | undefined): string {
  if (!raw) return UNCERTAIN;
  const trimmed = stripDecorations(String(raw));
  if (!trimmed || trimmed === UNCERTAIN) return UNCERTAIN;

  const lower = trimmed.toLowerCase();
  if (lower.includes('largemouth') || trimmed.includes('大口黑鲈')) return UNCERTAIN;

  const exact = FISH_CATALOG.find((name) => name === trimmed);
  if (exact) return exact;

  const alias = ALIASES[trimmed] ?? ALIASES[lower];
  if (alias) return alias;

  const contained = FISH_CATALOG.find((name) => trimmed.includes(name) || name.includes(trimmed));
  if (contained && trimmed.length <= contained.length + 2) return contained;

  for (const [from, to] of Object.entries(ALIASES)) {
    if (trimmed.includes(from) && from.length >= 2) return to;
  }

  return UNCERTAIN;
}

export function isCatalogFish(name: string): boolean {
  return (FISH_CATALOG as readonly string[]).includes(name);
}

export function finalizeFishIdResult(input: {
  species?: string;
  confidence?: number;
  alternatives?: { species?: string; confidence?: number }[];
  cues?: string[];
}): FishIdResult {
  let species = normalizeFishName(input.species);
  let confidence = clamp01(input.confidence);
  let alternatives = (input.alternatives ?? [])
    .map((item) => ({
      species: normalizeFishName(item.species),
      confidence: clamp01(item.confidence),
    }))
    .filter((item) => item.species !== UNCERTAIN && item.species !== species)
    .slice(0, 3);
  if (species === UNCERTAIN && alternatives[0]) {
    const pick = alternatives[0];
    species = pick.species;
    confidence = Math.min(0.62, Math.max(pick.confidence || 0, 0.5));
    alternatives = alternatives.slice(1);
  }
  const cues = (input.cues ?? []).map((c) => String(c).trim()).filter(Boolean).slice(0, 3);
  return {
    species,
    confidence,
    alternatives,
    cues,
    inCatalog: isCatalogFish(species),
  };
}

function clamp01(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export const LOW_CONFIDENCE = 0.45;

function parseEmbeddedJson(content: string): {
  species?: string;
  confidence?: number;
  alternatives?: { species?: string; confidence?: number }[];
  cues?: string[];
} | null {
  const trimmed = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as {
      species?: string;
      confidence?: number;
      alternatives?: { species?: string; confidence?: number }[];
      cues?: string[];
    };
  } catch {
    return null;
  }
}

export function parseFishReply(text: string): FishIdResult {
  const fromJson = parseEmbeddedJson(text);
  if (fromJson?.species) return finalizeFishIdResult(fromJson);

  const ranked = [...FISH_CATALOG].sort((a, b) => b.length - a.length);
  const hits = ranked.filter((name) => text.includes(name));
  const unique: string[] = [];
  for (const name of hits) {
    if (!unique.includes(name)) unique.push(name);
  }
  const species = unique[0] ?? UNCERTAIN;
  const alternatives = unique.slice(1, 4).map((name, i) => ({ species: name, confidence: Math.max(0.2, 0.5 - i * 0.1) }));
  const cue = text.replace(/\s+/g, ' ').trim().slice(0, 80);
  return finalizeFishIdResult({
    species,
    confidence: species === UNCERTAIN ? 0 : 0.7,
    alternatives,
    cues: cue ? [cue] : ['豆包未给出明确鱼名'],
  });
}
