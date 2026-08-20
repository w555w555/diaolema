import { bumpInbox } from './chatInbox';
import { unionNames } from './cloudMerge';
import type { InboxItem } from './chatInbox';

const BLOCK_KEY = 'diaolema.safety.blocks.v1';
const REPORT_KEY = 'diaolema.safety.reports.v1';

export type ReportReason = 'spam' | 'abuse' | 'fake' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: '垃圾广告' },
  { id: 'abuse', label: '辱骂骚扰' },
  { id: 'fake', label: '虚假渔获' },
  { id: 'other', label: '其他' },
];

export type SafetyReport = {
  id: string;
  author: string;
  reason: ReportReason;
  createdAt: string;
};

export type SafetyState = {
  blocks: string[];
  reports: SafetyReport[];
};

const listeners = new Set<() => void>();
let state: SafetyState = { blocks: [], reports: [] };

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readNames(key: string): string[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((row) => String(row).trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

function isReport(row: unknown): row is SafetyReport {
  if (!row || typeof row !== 'object') return false;
  const item = row as SafetyReport;
  return Boolean(item.id && item.author && item.reason && item.createdAt);
}

function readReports(): SafetyReport[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(REPORT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isReport) : [];
  } catch {
    return [];
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
  bumpInbox();
}

export function hydrateSafety(): SafetyState {
  state = { blocks: readNames(BLOCK_KEY), reports: readReports() };
  emit();
  return state;
}

if (typeof window !== 'undefined') {
  hydrateSafety();
}

export function subscribeSafety(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSafety(): SafetyState {
  return state;
}

function clipAuthor(name: string): string {
  return name.trim();
}

export function isBlocked(name: string, blocks = state.blocks): boolean {
  const author = clipAuthor(name);
  return Boolean(author) && blocks.includes(author);
}

export function applyBlocks(names: Iterable<string>): SafetyState {
  const blocks = unionNames(state.blocks, names);
  state = { ...state, blocks };
  storage()?.setItem(BLOCK_KEY, JSON.stringify(blocks));
  emit();
  return state;
}

export function blockAuthor(name: string, me = ''): SafetyState {
  const author = clipAuthor(name);
  const self = clipAuthor(me);
  if (!author || (self && author === self)) return state;
  if (state.blocks.includes(author)) return state;
  state = { ...state, blocks: [...state.blocks, author] };
  storage()?.setItem(BLOCK_KEY, JSON.stringify(state.blocks));
  emit();
  return state;
}

export function unblockAuthor(name: string): SafetyState {
  const author = clipAuthor(name);
  state = { ...state, blocks: state.blocks.filter((row) => row !== author) };
  storage()?.setItem(BLOCK_KEY, JSON.stringify(state.blocks));
  emit();
  return state;
}

export function reportAuthor(name: string, reason: ReportReason): SafetyReport | null {
  const author = clipAuthor(name);
  if (!author) return null;
  const row: SafetyReport = {
    id: `r-${Date.now()}`,
    author,
    reason,
    createdAt: new Date().toISOString(),
  };
  state = { ...state, reports: [...state.reports, row] };
  storage()?.setItem(REPORT_KEY, JSON.stringify(state.reports));
  emit();
  return row;
}

export function hideByAuthor<T extends { author: string }>(rows: T[], blocked: Iterable<string> = state.blocks): T[] {
  const set = new Set([...blocked].map(clipAuthor).filter(Boolean));
  if (!set.size) return rows;
  return rows.filter((row) => !set.has(clipAuthor(row.author)));
}

export function hideInboxFromBlocked(items: InboxItem[], blocked: Iterable<string> = state.blocks): InboxItem[] {
  const set = new Set([...blocked].map(clipAuthor).filter(Boolean));
  if (!set.size) return items;
  return items.filter((item) => item.kind !== 'dm' || !set.has(clipAuthor(item.title)));
}
