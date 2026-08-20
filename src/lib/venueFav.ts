import { unionNames } from './cloudMerge';

const FAV_KEY = 'diaolema.venue.fav.v1';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readIds(): string[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): string[] {
  storage()?.setItem(FAV_KEY, JSON.stringify(ids));
  return ids;
}

export function loadVenueFavIds(): string[] {
  return readIds();
}

export function unionVenueFavIds(remote: Iterable<string>, current = loadVenueFavIds()): string[] {
  return writeIds(unionNames(current, remote));
}

export function toggleVenueFav(venueId: string, current = loadVenueFavIds()): string[] {
  const id = venueId.trim();
  if (!id) return current;
  const next = current.includes(id) ? current.filter((row) => row !== id) : [...current, id];
  return writeIds(next);
}

export function isVenueFaved(venueId: string, current = loadVenueFavIds()): boolean {
  return current.includes(venueId);
}
