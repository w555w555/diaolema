import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { DEFAULT_INGEST_CONFIG, type IngestConfig } from '../ingest/config';
import { ALL_SPOTS } from '../parseShare';
import { parseScoutYaml } from './parseYaml';
import { domainsForSite, enabledPlatforms } from './publicSearch';
import type { ScoutConfig } from './types';

export function scoutPaths(root: string, config: ScoutConfig) {
  const output = join(root, config.storage.output_dir);
  return {
    output,
    db: join(output, config.storage.db_name),
    reports: join(output, config.storage.report_dir),
    posts: join(output, config.storage.post_archive_dir),
    extraLinks: join(output, 'manual_links.json'),
    yaml: join(root, 'fish_scout.config.yaml'),
  };
}

function isUsableApiKey(value: string | undefined): boolean {
  const key = (value || '').trim();
  return Boolean(key) && !key.includes('YOUR_API_KEY');
}

export function loadBaiduSearchApiKey(root = process.cwd()): string {
  const fromEnv = process.env.BAIDU_SEARCH_API_KEY || process.env.FISH_SCOUT_BAIDU_KEY || '';
  if (isUsableApiKey(fromEnv)) return fromEnv.trim();
  const configPath = join(root, '.cursor', 'skills', 'baidu-search', 'scripts', 'config.json');
  if (!existsSync(configPath)) return '';
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { api_key?: string };
    return isUsableApiKey(parsed.api_key) ? String(parsed.api_key).trim() : '';
  } catch {
    return '';
  }
}

export function loadScoutConfig(root = process.cwd()): ScoutConfig {
  const yamlPath = join(root, 'fish_scout.config.yaml');
  const text = existsSync(yamlPath) ? readFileSync(yamlPath, 'utf8') : '';
  const config = text ? parseScoutYaml(text) : parseScoutYaml('');
  const paths = scoutPaths(root, config);
  mkdirSync(paths.output, { recursive: true });
  if (existsSync(paths.extraLinks)) {
    try {
      const extra = JSON.parse(readFileSync(paths.extraLinks, 'utf8')) as string[];
      if (Array.isArray(extra)) {
        config.manual_links = [...new Set([...config.manual_links, ...extra.filter((u) => /^https?:\/\//i.test(u))])];
      }
    } catch {
      /* ignore */
    }
  }
  return config;
}

export function saveExtraManualLink(root: string, url: string): string[] {
  const config = loadScoutConfig(root);
  const paths = scoutPaths(root, config);
  const current = config.manual_links.filter((u) => u !== url);
  const next = [...current, url];
  writeFileSync(paths.extraLinks, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function toIngestConfig(scout: ScoutConfig, root = process.cwd()): IngestConfig {
  const fileEnv = loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', root, '');
  const keyName = scout.ai.api_key_env;
  const key = ((keyName && (process.env[keyName] || fileEnv[keyName])) || '').trim();
  const platforms = enabledPlatforms(scout).map((p) => ({
    id: p.id,
    name: p.name,
    domains: domainsForSite(p.site),
  }));
  const extraSpots = scout.locations.map((name) => {
    const known = ALL_SPOTS.find((s) => s.name === name);
    return { name, aliases: known?.aliases };
  });
  return {
    platforms: [
      ...platforms,
      { id: 'weibo', name: '微博', domains: ['weibo.com', 'weibo.cn'] },
    ],
    cities: scout.locations,
    spots: extraSpots,
    fish_species: [...new Set([...scout.fish_species, ...DEFAULT_INGEST_CONFIG.fish_species])],
    fishing_methods: [...new Set([...scout.methods, ...DEFAULT_INGEST_CONFIG.fishing_methods])],
    baits: [...new Set([...scout.baits, ...DEFAULT_INGEST_CONFIG.baits])],
    gated_domains: [
      'xiaohongshu.com',
      'xhslink.com',
      'douyin.com',
      'iesdouyin.com',
      'weibo.com',
      'weibo.cn',
      'mp.weixin.qq.com',
      'weixin.qq.com',
      'zhihu.com',
    ],
    ai: {
      enabled: Boolean(scout.ai.enabled && key && scout.ai.base_url && scout.ai.model),
      base_url: scout.ai.base_url,
      api_key: key,
      model: scout.ai.model,
      max_input_chars: scout.ai.max_input_chars || 3000,
    },
  };
}
