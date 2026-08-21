import { normalizeWater, type NormalizedWater, type WaterQuery } from './water';

const KEY = 'diaolema.water.prefs.v1';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadWaterPrefs(): NormalizedWater {
  const store = storage();
  if (!store) return normalizeWater();
  try {
    const raw = store.getItem(KEY);
    if (!raw) return normalizeWater();
    const parsed = JSON.parse(raw) as WaterQuery;
    return normalizeWater(parsed);
  } catch {
    return normalizeWater();
  }
}

export function saveWaterPrefs(query: WaterQuery): NormalizedWater {
  const next = normalizeWater(query);
  storage()?.setItem(KEY, JSON.stringify(next));
  return next;
}
