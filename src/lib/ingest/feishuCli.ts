import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { FEISHU_FIELDS, type FeishuDbConfig, type FeishuFieldKey } from './store';
import type { NewPostRow, PostRow, PostStore } from './types';

export type LarkRunner = (args: string[]) => Promise<unknown>;

const TEXT_KEYS: FeishuFieldKey[] = [
  'url',
  'platform',
  'platform_name',
  'title',
  'snippet',
  'content',
  'crawl_time',
  'selected_location',
  'city',
  'location_text',
  'fish_species',
  'fishing_method',
  'bait',
  'catch_amount',
  'ai_summary',
  'ai_location',
  'ai_fish_species',
  'ai_fishing_method',
  'ai_bait',
  'ai_catch_amount',
  'ai_time_hint',
  'raw_text',
  'author',
];

export function resolveLarkBin(root = process.cwd()): string {
  const exe = process.platform === 'win32' ? 'lark-cli.exe' : 'lark-cli';
  const nested = join(root, 'node_modules', '@larksuite', 'cli', 'bin', exe);
  if (existsSync(nested)) return nested;
  return join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'lark-cli.cmd' : 'lark-cli');
}

export function parseCliJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error(text.trim().slice(0, 240) || 'lark-cli 没有返回 JSON');
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

export function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(cellText).filter(Boolean).join('');
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.text === 'string') return rec.text;
    if (rec.value != null) return cellText(rec.value);
    if (Array.isArray(rec.text)) return cellText(rec.text);
  }
  return '';
}

export function datetimeText(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  const text = cellText(value).trim();
  if (/^\d{13}$/.test(text)) return new Date(Number(text)).toISOString();
  return text;
}

function asFeishuDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function cellNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = cellText(value).trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

type RawRecord = {
  record_id?: string;
  id?: string;
  fields?: Record<string, unknown>;
};

export function fieldsFromRecord(raw: RawRecord | Record<string, unknown>): Record<string, unknown> {
  if (raw && typeof raw === 'object' && 'fields' in raw && raw.fields && typeof raw.fields === 'object') {
    return raw.fields as Record<string, unknown>;
  }
  return (raw ?? {}) as Record<string, unknown>;
}

export function recordIdOf(raw: RawRecord | Record<string, unknown>, fallback = ''): string {
  const rec = raw as RawRecord;
  return String(rec.record_id || rec.id || fallback);
}

export function postFromFeishuFields(id: string, fields: Record<string, unknown>): PostRow {
  const text = (key: FeishuFieldKey) => cellText(fields[FEISHU_FIELDS[key]]);
  return {
    id,
    platform: text('platform'),
    platform_name: text('platform_name'),
    url: text('url'),
    title: text('title'),
    snippet: text('snippet'),
    content: text('content'),
    crawl_time: datetimeText(fields[FEISHU_FIELDS.crawl_time]),
    selected_location: text('selected_location'),
    city: text('city'),
    location_text: text('location_text'),
    fish_species: text('fish_species'),
    fishing_method: text('fishing_method'),
    bait: text('bait'),
    catch_amount: text('catch_amount'),
    confidence_score: cellNumber(fields[FEISHU_FIELDS.confidence_score]) ?? 0,
    ai_summary: text('ai_summary'),
    ai_location: text('ai_location'),
    ai_fish_species: text('ai_fish_species'),
    ai_fishing_method: text('ai_fishing_method'),
    ai_bait: text('ai_bait'),
    ai_catch_amount: text('ai_catch_amount'),
    ai_time_hint: text('ai_time_hint'),
    ai_confidence_score: cellNumber(fields[FEISHU_FIELDS.ai_confidence_score]),
    raw_text: text('raw_text'),
    author: text('author'),
    lon: cellNumber(fields[FEISHU_FIELDS.lon]),
    lat: cellNumber(fields[FEISHU_FIELDS.lat]),
  };
}

export function fieldsFromPost(row: NewPostRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of TEXT_KEYS) {
    const value = row[key];
    if (value == null || value === '') continue;
    if (key === 'crawl_time') {
      out[FEISHU_FIELDS.crawl_time] = asFeishuDateTime(String(value));
      continue;
    }
    out[FEISHU_FIELDS[key]] = String(value).slice(0, 4000);
  }
  if (row.confidence_score != null) out[FEISHU_FIELDS.confidence_score] = row.confidence_score;
  if (row.ai_confidence_score != null) out[FEISHU_FIELDS.ai_confidence_score] = row.ai_confidence_score;
  if (row.lon != null) out[FEISHU_FIELDS.lon] = row.lon;
  if (row.lat != null) out[FEISHU_FIELDS.lat] = row.lat;
  return out;
}

function asRecordList(payload: unknown): RawRecord[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const data = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;
  const items = data.items ?? data.records ?? data.record_list ?? root.items ?? root.records;
  if (Array.isArray(items)) return items as RawRecord[];
  if (data.record && typeof data.record === 'object') return [data.record as RawRecord];
  if (root.record && typeof root.record === 'object') return [root.record as RawRecord];
  return [];
}

export function parseFeishuRecords(payload: unknown): PostRow[] {
  return asRecordList(payload)
    .map((raw) => postFromFeishuFields(recordIdOf(raw), fieldsFromRecord(raw)))
    .filter((row) => row.id);
}

export function parseInsertedRecord(payload: unknown, fallback: NewPostRow): PostRow {
  const [first] = parseFeishuRecords(payload);
  if (first) return { ...fallback, ...first, id: first.id };
  const root = payload as Record<string, unknown>;
  const data = (root?.data ?? root) as Record<string, unknown>;
  const id = String(data.record_id || data.id || `feishu-${Date.now()}`);
  return { ...fallback, id };
}

export function hasMore(payload: unknown, batchSize: number): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const root = payload as Record<string, unknown>;
  const data = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;
  if (data.has_more === true) return true;
  return asRecordList(payload).length >= batchSize;
}

export function createLarkRunner(root = process.cwd(), timeoutMs = 60000): LarkRunner {
  const bin = resolveLarkBin(root);
  return (args: string[]) =>
    new Promise((resolve, reject) => {
      const child = spawn(bin, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('lark-cli 超时'));
      }, timeoutMs);
      child.stdout?.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        const text = `${stdout}\n${stderr}`.trim();
        try {
          const parsed = parseCliJson(text) as Record<string, unknown>;
          if (parsed.ok === false) {
            const err = parsed.error as { message?: string } | undefined;
            reject(new Error(err?.message || text.slice(0, 240) || `lark-cli 退出 ${code}`));
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(text.slice(0, 240) || `lark-cli 退出 ${code}`));
        }
      });
    });
}

export function createFeishuStore(config: FeishuDbConfig, run: LarkRunner): PostStore {
  const identity = ['--as', config.identity];
  const loc = ['--base-token', config.baseToken, '--table-id', config.tableId, ...identity];

  return {
    async list() {
      const all: PostRow[] = [];
      const limit = 200;
      let offset = 0;
      for (;;) {
        const payload = await run([
          'base',
          '+record-list',
          ...loc,
          '--limit',
          String(limit),
          '--offset',
          String(offset),
          '--format',
          'json',
          '--sort-json',
          JSON.stringify([{ field: FEISHU_FIELDS.crawl_time, desc: true }]),
        ]);
        const batch = parseFeishuRecords(payload);
        all.push(...batch);
        if (!hasMore(payload, limit) || batch.length === 0) break;
        offset += batch.length;
        if (offset > 5000) break;
      }
      return all;
    },
    async findByUrl(url: string) {
      const payload = await run([
        'base',
        '+record-list',
        ...loc,
        '--limit',
        '5',
        '--format',
        'json',
        '--filter-json',
        JSON.stringify({ logic: 'and', conditions: [[FEISHU_FIELDS.url, '==', url]] }),
      ]);
      return parseFeishuRecords(payload).find((row) => row.url === url);
    },
    async insert(row: NewPostRow) {
      const payload = await run([
        'base',
        '+record-upsert',
        ...loc,
        '--json',
        JSON.stringify(fieldsFromPost(row)),
      ]);
      return parseInsertedRecord(payload, row);
    },
  };
}
