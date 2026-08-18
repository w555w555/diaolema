import seed from '../data/spot-reviews.json';
import type { SeedSpotReview, SpotReview } from '../types';

const STORAGE_KEY = 'diaolema.spot.reviews.v1';

function fromSeed(rows: SeedSpotReview[], now = new Date()): SpotReview[] {
  return rows.map((row) => ({
    id: row.id,
    venueId: row.venueId,
    author: row.author,
    rating: row.rating,
    body: row.body,
    imageUrl: row.imageUrl,
    source: row.source,
    createdAt: new Date(now.getTime() - row.hoursAgo * 3600 * 1000).toISOString(),
  }));
}

function readUserReviews(): SpotReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpotReview[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadSpotReviews(): SpotReview[] {
  const seeded = fromSeed(seed.reviews as SeedSpotReview[]);
  const users = readUserReviews();
  const seen = new Set(users.map((row) => row.id));
  return [...users, ...seeded.filter((row) => !seen.has(row.id))];
}

export function persistSpotReview(review: SpotReview): SpotReview[] {
  const stored = [review, ...readUserReviews().filter((row) => row.id !== review.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return loadSpotReviews();
}

export function createSpotReview(
  input: Omit<SpotReview, 'id' | 'createdAt' | 'source'> & { id?: string },
): SpotReview {
  return {
    ...input,
    id: input.id ?? `review-${Date.now()}`,
    source: 'user',
    createdAt: new Date().toISOString(),
  };
}
