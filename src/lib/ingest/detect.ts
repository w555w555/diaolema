import type { IngestConfig } from './config';

export function detectPlatform(url: string, config: IngestConfig): [string, string] {
  const hay = (url || '').toLowerCase();
  for (const platform of config.platforms) {
    if (platform.domains.some((d) => hay.includes(d.toLowerCase()))) {
      return [platform.id, platform.name];
    }
  }
  return ['public', '公开渔讯'];
}
