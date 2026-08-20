import type { CatchReport } from '../types';
import { HUB_ROOMS } from './hub';

export type RepostPayload = {
  reportId?: string;
  author: string;
  spotName: string;
  fish: string;
};

const BODY_MAX = 200;
const MARKER = /(?:^|\s)#yj:(\S+)\s*$/;
const LINE = /^转发[ ·]+(.+?) 在(.+?) 钓到(.+)$/;

export function shareCaption(report: CatchReport): string {
  const title = report.title?.trim() || `${report.author}钓到了${report.fish}`;
  return `【渔见】${title} · ${report.spotName}`;
}

export function repostChatBody(report: CatchReport): string {
  const marker = ` #yj:${report.id}`;
  const budget = Math.max(8, BODY_MAX - marker.length);
  let line = `转发 · ${report.author} 在${report.spotName} 钓到${report.fish}`;
  if (line.length > budget) line = line.slice(0, budget);
  return `${line}${marker}`.slice(0, BODY_MAX);
}

export function parseRepostBody(body: string): RepostPayload | null {
  const text = body.trim();
  const mark = text.match(MARKER);
  const line = text.replace(MARKER, '').trim();
  const hit = line.match(LINE);
  if (!hit && !mark) return null;
  return {
    reportId: mark?.[1],
    author: hit?.[1] ?? '',
    spotName: hit?.[2] ?? '',
    fish: hit?.[3] ?? '',
  };
}

export function isRepostBody(body: string): boolean {
  return parseRepostBody(body) != null;
}

export function resolveRepost(body: string, reports: CatchReport[]): CatchReport | null {
  const parsed = parseRepostBody(body);
  if (!parsed) return null;
  if (parsed.reportId) {
    return reports.find((row) => row.id === parsed.reportId) ?? null;
  }
  if (!parsed.author || !parsed.spotName || !parsed.fish) return null;
  return (
    reports.find(
      (row) => row.author === parsed.author && row.spotName === parsed.spotName && row.fish === parsed.fish,
    ) ?? null
  );
}

export function repostRooms(): { id: string; name: string }[] {
  return HUB_ROOMS.map((room) => ({ id: room.id, name: room.name }));
}
