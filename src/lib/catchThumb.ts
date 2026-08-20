import type { CatchReport } from '../types';
import { catchImages } from './catchMedia';

const PALETTE: [string, string][] = [
  ['#12352f', '#2fc7a0'],
  ['#2a2414', '#e8b24a'],
  ['#1a2c3a', '#5aa8e0'],
  ['#2a1c1a', '#e06a5a'],
  ['#1d2a1c', '#7cbf6a'],
  ['#241a2a', '#c9a0e0'],
];

function hashFish(fish: string): number {
  let h = 0;
  for (const ch of fish) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function catchThumb(fish: string): string {
  const [bg, accent] = PALETTE[hashFish(fish) % PALETTE.length];
  const size = fish.length <= 2 ? 32 : fish.length === 3 ? 26 : 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <rect width="160" height="160" fill="${bg}"/>
    <text x="80" y="92" text-anchor="middle" font-size="${size}" font-weight="700" fill="${accent}" font-family="Noto Sans SC, sans-serif">${escapeXml(fish)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export function shareCover(report: Pick<CatchReport, 'fish' | 'imageUrl' | 'imageUrls'>): string {
  return catchImages(report)[0] || catchThumb(report.fish);
}

export const HOME_SHARE_LIMIT = 12;

export function shareBody(note: string | undefined): string {
  if (!note) return '';
  return note.replace(/示例短文[，,].*$/, '').trim();
}

export function shareExcerpt(note: string | undefined, max = 52): string {
  const text = shareBody(note);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
