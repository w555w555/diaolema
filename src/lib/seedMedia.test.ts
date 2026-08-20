import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import catchReports from '../data/catch-reports.json';
import spotReviews from '../data/spot-reviews.json';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('seed media files', () => {
  it('今日渔获与钓点示例图都在 public 里', () => {
    const shareUrls = catchReports.flatMap((row) => [row.imageUrl, ...(row.imageUrls ?? [])]).filter(Boolean);
    const spotUrls = spotReviews.reviews.map((row) => row.imageUrl).filter(Boolean);
    const urls = [...new Set([...shareUrls, ...spotUrls])];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      if (!url.startsWith('/shares/') && !url.startsWith('/spot-photos/')) continue;
      expect(existsSync(resolve(root, 'public', url.slice(1))), url).toBe(true);
    }
  });
});
