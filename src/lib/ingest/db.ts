import { createHash } from 'node:crypto';
import { loadEnv } from 'vite';
import { createFeishuStore, createLarkRunner } from './feishuCli';
import { feishuDbConfigFromEnv, feishuDbConfigured } from './store';
import type { PostStore } from './types';

export type { PostRow } from './types';

export function localUrlFor(text: string): string {
  const hash = createHash('sha1').update(text).digest('hex').slice(0, 12);
  return `local://${hash}`;
}

export function listPosts(store: PostStore) {
  return store.list();
}

export function createAppStore(root = process.cwd(), env?: Record<string, string | undefined>): PostStore {
  const loaded = env ?? loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', root, '');
  const merged = { ...loaded, ...process.env };
  if (!feishuDbConfigured(merged)) {
    const err = new Error('feishu_not_configured');
    err.name = 'FeishuNotConfigured';
    throw err;
  }
  return createFeishuStore(feishuDbConfigFromEnv(merged), createLarkRunner(root));
}
