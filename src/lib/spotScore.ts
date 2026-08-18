import type { SpotReview } from '../types';

export function averageScore(ratings: number[]): number | null {
  if (!ratings.length) return null;
  const sum = ratings.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export type StarFill = 'full' | 'half' | 'empty';

export function starFill(score: number | null): StarFill[] {
  if (score == null) return ['empty', 'empty', 'empty', 'empty', 'empty'];
  const halves = Math.round(Math.max(0, Math.min(5, score)) * 2);
  return [0, 1, 2, 3, 4].map((index) => {
    const start = index * 2;
    if (halves >= start + 2) return 'full';
    if (halves >= start + 1) return 'half';
    return 'empty';
  });
}

export function starsHtml(score: number | null): string {
  const inner = starFill(score)
    .map((fill) => `<i data-fill="${fill}"></i>`)
    .join('');
  return `<span class="spot-stars-view">${inner}</span>`;
}

export function reviewsForVenue(venueId: string, reviews: SpotReview[]): SpotReview[] {
  return reviews
    .filter((row) => row.venueId === venueId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function reviewCountLabel(count: number): string {
  if (count <= 0) return '暂无反馈';
  return `${count} 条反馈`;
}

export function scoreForVenue(venueId: string, reviews: SpotReview[]): number | null {
  return averageScore(reviewsForVenue(venueId, reviews).map((row) => row.rating));
}

export function coverPhotoForVenue(venueId: string, reviews: SpotReview[]): string | undefined {
  return reviewsForVenue(venueId, reviews).find((row) => row.imageUrl)?.imageUrl;
}

export function rankVenues<T extends { id: string }>(venues: T[], reviews: SpotReview[]): T[] {
  return [...venues].sort((a, b) => {
    const scoreA = scoreForVenue(a.id, reviews);
    const scoreB = scoreForVenue(b.id, reviews);
    if (scoreA == null && scoreB == null) return 0;
    if (scoreA == null) return 1;
    if (scoreB == null) return -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return reviewsForVenue(b.id, reviews).length - reviewsForVenue(a.id, reviews).length;
  });
}
