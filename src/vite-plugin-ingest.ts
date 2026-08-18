import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { createAppStore } from './lib/ingest/db';
import { savePost } from './lib/ingest/savePost';
import { catchReportToPost, postToCatchReport } from './lib/ingest/toCatchReport';
import { feishuDbConfigured } from './lib/ingest/store';
import type { PostStore } from './lib/ingest/types';
import { loadScoutConfig, saveExtraManualLink, scoutPaths, toIngestConfig } from './lib/scout/loadConfig';
import { readTodayReport, runDailyScout } from './lib/scout/runDaily';
import { fishIdAgentUrl, fishIdConfigured, identifyFishFromImage } from './lib/fishId/server';
import { readAmapConfig } from './lib/mapConfig';
import type { CatchReport } from './types';

const root = () => process.cwd();

function appEnv(): Record<string, string> {
  return { ...loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', root(), ''), ...process.env } as Record<string, string>;
}

function tryStore(): { store?: PostStore; error?: string } {
  if (!feishuDbConfigured(appEnv())) return { error: 'feishu_not_configured' };
  try {
    return { store: createAppStore(root(), appEnv()) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function isFeishuMissing(error: unknown): boolean {
  return (
    (error instanceof Error && (error.name === 'FeishuNotConfigured' || error.message === 'feishu_not_configured')) ||
    String(error).includes('feishu_not_configured')
  );
}

function ingestNow() {
  const config = loadScoutConfig(root());
  return { config, ingest: toIngestConfig(config, root()), paths: scoutPaths(root(), config) };
}

function extractUrl(text: string): string {
  const m = text.match(/https?:\/\/[^\s]+/i);
  return m?.[0]?.replace(/[)，。]+$/, '') ?? '';
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function handle(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
  const url = req.url?.split('?')[0] ?? '';
  if (req.method === 'GET' && url === '/api/posts') {
    const ready = tryStore();
    if (!ready.store) {
      sendJson(res, 200, { reports: [], configured: false, error: ready.error });
      return;
    }
    try {
      const reports = (await ready.store.list()).map((row) => postToCatchReport(row));
      sendJson(res, 200, { reports, configured: true });
    } catch (error) {
      sendJson(res, 500, { reports: [], configured: true, error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (req.method === 'GET' && url === '/api/daily-report') {
    const today = readTodayReport(root());
    sendJson(res, 200, today ?? { date: null, markdown: '', path: '' });
    return;
  }
  if (req.method === 'POST' && url === '/api/manual-link') {
    try {
      const payload = JSON.parse((await readBody(req)) || '{}') as { url?: string; snippet?: string };
      const link = payload.url || extractUrl(payload.snippet || '');
      if (!/^https?:\/\//i.test(link)) {
        sendJson(res, 400, { error: '请提供 http(s) 链接' });
        return;
      }
      saveExtraManualLink(root(), link);
      const ready = tryStore();
      if (!ready.store) {
        sendJson(res, 503, { error: ready.error || 'feishu_not_configured' });
        return;
      }
      const { ingest, paths, config } = ingestNow();
      const result = await savePost(
        ready.store,
        { url: link, title: '', snippet: payload.snippet || `手动保存链接 ${link}` },
        ingest,
        config.selected_locations[0] || '',
        null,
        null,
        { archiveDir: paths.posts },
      );
      sendJson(res, 200, {
        inserted: result.inserted,
        report: result.post ? postToCatchReport(result.post) : null,
      });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (req.method === 'POST' && url === '/api/scout/run') {
    try {
      const result = await runDailyScout(root());
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (req.method === 'GET' && url === '/api/map-config') {
    sendJson(res, 200, readAmapConfig(appEnv()));
    return;
  }
  if (req.method === 'GET' && url === '/api/fish-id') {
    sendJson(res, 200, { configured: fishIdConfigured(appEnv()), agentUrl: fishIdAgentUrl(appEnv()) });
    return;
  }
  if (req.method === 'POST' && url === '/api/fish-id') {
    try {
      const payload = JSON.parse((await readBody(req)) || '{}') as { imageBase64?: string; mime?: string };
      const imageBase64 = payload.imageBase64?.trim() ?? '';
      if (!imageBase64) {
        sendJson(res, 400, { error: '请提供图片' });
        return;
      }
      const result = await identifyFishFromImage(imageBase64, payload.mime || 'image/jpeg', appEnv());
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'not_configured' || (error instanceof Error && error.name === 'FishIdNotConfigured')) {
        sendJson(res, 503, { error: 'not_configured' });
        return;
      }
      sendJson(res, 500, { error: message });
    }
    return;
  }
  if (req.method === 'POST' && url === '/api/ingest') {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}') as {
        url?: string;
        title?: string;
        snippet?: string;
        selected_location?: string;
        forced_platform?: string | null;
        forced_platform_name?: string | null;
      };
      const snippet = payload.snippet ?? '';
      const itemUrl = payload.url || extractUrl(snippet);
      const ready = tryStore();
      if (!ready.store) {
        sendJson(res, 503, { error: ready.error || 'feishu_not_configured' });
        return;
      }
      const { ingest, paths, config } = ingestNow();
      const result = await savePost(
        ready.store,
        { url: itemUrl, title: payload.title ?? '', snippet },
        ingest,
        payload.selected_location ?? config.selected_locations[0] ?? '上海',
        payload.forced_platform ?? null,
        payload.forced_platform_name ?? null,
        { archiveDir: paths.posts },
      );
      sendJson(res, 200, {
        inserted: result.inserted,
        report: result.post ? postToCatchReport(result.post) : null,
      });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (req.method === 'POST' && url === '/api/report') {
    try {
      const report = JSON.parse((await readBody(req)) || '{}') as CatchReport;
      if (!report?.id || !report.fish) {
        sendJson(res, 400, { error: '请提供渔获' });
        return;
      }
      const ready = tryStore();
      if (!ready.store) {
        sendJson(res, 503, { error: ready.error || 'feishu_not_configured' });
        return;
      }
      const row = catchReportToPost(report);
      const existing = await ready.store.findByUrl(row.url);
      if (existing) {
        sendJson(res, 200, { inserted: false, report: postToCatchReport(existing) });
        return;
      }
      const post = await ready.store.insert(row);
      sendJson(res, 200, { inserted: true, report: postToCatchReport(post) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, isFeishuMissing(error) ? 503 : 500, { error: message });
    }
    return;
  }
  next();
}

export function ingestPlugin(): Plugin {
  return {
    name: 'diaolema-ingest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next).catch((error) => {
          sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next).catch((error) => {
          sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        });
      });
    },
  };
}
