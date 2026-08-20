import seed from '../data/catch-reports.json';
import type { CatchReport, SeedCatch } from '../types';
import { stripInlineImage } from './photo';

const STORAGE_KEY = 'diaolema.catches.v1';

function fromSeed(rows: SeedCatch[], now = new Date()): CatchReport[] {
  return rows.map((row) => ({
    id: row.id,
    author: row.author,
    fish: row.fish,
    spotName: row.spotName,
    lon: row.lon,
    lat: row.lat,
    source: row.source,
    note: row.note,
    title: row.title,
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl,
    imageUrls: row.imageUrls,
    videoUrl: row.videoUrl,
    caughtAt: new Date(now.getTime() - row.hoursAgo * 3600 * 1000).toISOString(),
  }));
}

function readUserReports(): CatchReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CatchReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadReports(): CatchReport[] {
  const seeded = fromSeed(seed as SeedCatch[]);
  const users = readUserReports();
  const seen = new Set(users.map((r) => r.id));
  return [...users, ...seeded.filter((r) => !seen.has(r.id))];
}

export function mergeReports(primary: CatchReport[], extra: CatchReport[]): CatchReport[] {
  const seen = new Set(primary.map((r) => r.id));
  return [...primary, ...extra.filter((r) => !seen.has(r.id))];
}

export async function loadServerReports(): Promise<CatchReport[]> {
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) return [];
    const data = (await res.json()) as { reports?: CatchReport[] };
    return Array.isArray(data.reports) ? data.reports : [];
  } catch {
    return [];
  }
}

export async function persistReportToServer(report: CatchReport): Promise<void> {
  try {
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(stripInlineImage(report)),
    });
  } catch {
    /* 飞书未登录时仍保留本机缓存 */
  }
}

export function persistReport(report: CatchReport): CatchReport[] {
  const stored = [report, ...readUserReports().filter((r) => r.id !== report.id)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.map((row, i) => (i === 0 ? stripInlineImage(row) : row))));
  }
  return loadReports();
}

export function createUserReport(
  input: Omit<CatchReport, 'id' | 'caughtAt' | 'source'> & {
    caughtAt?: string;
    id?: string;
    source?: CatchReport['source'];
  },
): CatchReport {
  return {
    ...input,
    id: input.id ?? `user-${Date.now()}`,
    source: input.source ?? 'user',
    caughtAt: input.caughtAt ?? new Date().toISOString(),
  };
}
