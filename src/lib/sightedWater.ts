import type { SightedWater, WaterTint } from '../types';

const KEY = 'diaolema.sightedWater.v2';
const LEGACY_KEY = 'diaolema.sightedWater.v1';

export type SightedWaterOption = {
  id: SightedWater;
  how: string;
  swatch: string;
};

/** 塘边肉眼可区分的水色：能不能见底，不是溶氧。 */
export const SIGHTED_WATER: SightedWaterOption[] = [
  { id: '清澈', how: '能看见底、草或砖石轮廓', swatch: '#7ec8e3' },
  { id: '微浑', how: '有色发闷，隐约有轮廓，看不清底', swatch: '#c4b896' },
  { id: '浑浊', how: '黄泥浆、发白或发黑，几乎不见底', swatch: '#c4a035' },
  { id: '肥水', how: '草绿或酱油色，夏天老塘常见', swatch: '#3d8c5a' },
];

const LEGACY: Record<string, SightedWater> = {
  清澈: '清澈',
  微浑: '微浑',
  黄泥: '浑浊',
  乳白: '浑浊',
  黑浑: '浑浊',
  浑浊: '浑浊',
  藻绿: '肥水',
  茶褐: '肥水',
  肥水: '肥水',
};

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function isSightedWater(value: string): value is SightedWater {
  return SIGHTED_WATER.some((row) => row.id === value);
}

export function migrateSightedWater(raw: string | null): SightedWater | null {
  if (!raw) return null;
  return LEGACY[raw] ?? null;
}

export function loadSightedWater(): SightedWater | null {
  const store = storage();
  if (!store) return null;
  const current = store.getItem(KEY);
  if (current && isSightedWater(current)) return current;
  const legacy = migrateSightedWater(store.getItem(LEGACY_KEY));
  if (legacy) {
    store.setItem(KEY, legacy);
    store.removeItem(LEGACY_KEY);
    return legacy;
  }
  return null;
}

export function persistSightedWater(value: SightedWater | null): SightedWater | null {
  const store = storage();
  if (!store) return value;
  if (!value) store.removeItem(KEY);
  else store.setItem(KEY, value);
  return value;
}

export function sightedWaterHow(id: SightedWater): string {
  return SIGHTED_WATER.find((row) => row.id === id)?.how ?? '';
}

/** 未目测时，降水浊度只映射到清澈/微浑/浑浊，不猜肥水。 */
export function rainTintToGuess(tint: WaterTint): SightedWater {
  if (tint === '浑浊') return '浑浊';
  if (tint === '微浑') return '微浑';
  return '清澈';
}

export type WaterLureHue = 'clear' | 'stained' | 'green' | 'dark';

export function waterLureHue(sighted: SightedWater | null, rainTint: WaterTint, raining: boolean): WaterLureHue {
  if (sighted === '清澈') return 'clear';
  if (sighted === '肥水') return 'green';
  if (sighted === '浑浊') return 'stained';
  if (sighted === '微浑') return 'stained';
  if (rainTint === '浑浊' || rainTint === '微浑' || raining) return 'stained';
  return 'clear';
}

export function lurePaint(hue: WaterLureHue, stained: string, clear: string): string {
  if (hue === 'green') return '草黄/图表绿';
  if (hue === 'dark') return '红头/暗色';
  if (hue === 'stained') return stained;
  return clear;
}
