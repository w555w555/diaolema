import { spawn, type ChildProcess } from 'node:child_process';
import { fetchPageText, isGatedUrl, type FetchPageDeps } from '../ingest/fetchPage';
import type { IngestConfig } from '../ingest/config';

export type DefuddleDeps = {
  spawnFn?: typeof spawn;
  command?: string;
  timeoutMs?: number;
};

let defuddleMissing = false;

export function resetDefuddleMissing(): void {
  defuddleMissing = false;
}

export async function tryDefuddleParse(url: string, deps: DefuddleDeps = {}): Promise<string> {
  if (defuddleMissing || process.env.FISH_SCOUT_SKIP_DEFUDDLE === '1') return '';
  if (!url || !/^https?:\/\//i.test(url)) return '';
  const command = deps.command ?? process.env.FISH_SCOUT_DEFUDDLE_BIN ?? 'defuddle';
  const timeoutMs = deps.timeoutMs ?? 12000;
  const spawnFn = deps.spawnFn ?? spawn;
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawnFn(command, ['parse', url, '--md'], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      defuddleMissing = true;
      resolve('');
      return;
    }
    let out = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve('');
    }, timeoutMs);
    child.stdout?.on('data', (chunk) => {
      out += String(chunk);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') defuddleMissing = true;
      resolve('');
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve('');
        return;
      }
      resolve(out.replace(/\s+/g, ' ').trim().slice(0, 20000));
    });
  });
}

export async function fetchPageTextWithDefuddle(
  url: string,
  config: IngestConfig,
  deps: FetchPageDeps & DefuddleDeps = {},
): Promise<string> {
  if (!url || isGatedUrl(url, config)) return '';
  const parsed = await tryDefuddleParse(url, deps);
  if (parsed) return parsed;
  return fetchPageText(url, config, deps);
}
