import type { ScoutConfig } from './types';

function unquote(value: string): string {
  const t = value.trim();
  const m = t.match(/^"(.*)"$/);
  return m ? m[1] : t;
}

function listBlock(text: string, key: string): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.match(new RegExp(`^${key}:`)));
  if (start < 0) return [];
  if (/\[\s*\]/.test(lines[start])) return [];
  const items: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^[^\s#]/.test(line)) break;
    const m = line.match(/^\s+-\s+(.*)$/);
    if (m) items.push(unquote(m[1]));
  }
  return items;
}

function mapBlock(text: string, key: string): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.match(new RegExp(`^${key}:\\s*$`)));
  const out: Record<string, string> = {};
  if (start < 0) return out;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^[^\s#]/.test(line)) break;
    const m = line.match(/^\s{2}([\w_]+):\s*(.*)$/);
    if (m && m[2] !== '') out[m[1]] = unquote(m[2]);
  }
  return out;
}

export function parseScoutYaml(text: string): ScoutConfig {
  const storage = mapBlock(text, 'storage');
  const ai = mapBlock(text, 'ai');
  const platforms: ScoutConfig['platforms'] = {};
  const platStart = text.split(/\r?\n/).findIndex((l) => l.startsWith('platforms:'));
  if (platStart >= 0) {
    const lines = text.split(/\r?\n/);
    let current = '';
    for (let i = platStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^[^\s#]/.test(line)) break;
      const id = line.match(/^\s{2}(\w+):\s*$/);
      if (id) {
        current = id[1];
        platforms[current] = { enabled: false, name: current, site: '' };
        continue;
      }
      if (!current) continue;
      const enabled = line.match(/^\s{4}enabled:\s*(true|false)/);
      if (enabled) platforms[current].enabled = enabled[1] === 'true';
      const name = line.match(/^\s{4}name:\s*(.*)$/);
      if (name) platforms[current].name = unquote(name[1]);
      const site = line.match(/^\s{4}site:\s*(.*)$/);
      if (site) platforms[current].site = unquote(site[1]);
    }
  }
  return {
    storage: {
      output_dir: storage.output_dir || './fish_scout_data',
      db_name: storage.db_name || 'fish_scout.db',
      report_dir: storage.report_dir || 'reports',
      post_archive_dir: storage.post_archive_dir || 'posts',
    },
    selected_locations: listBlock(text, 'selected_locations'),
    locations: listBlock(text, 'locations'),
    platforms,
    base_keywords: listBlock(text, 'base_keywords'),
    fish_species: listBlock(text, 'fish_species'),
    methods: listBlock(text, 'methods'),
    baits: listBlock(text, 'baits'),
    ai: {
      enabled: ai.enabled === 'true',
      base_url: ai.base_url || '',
      model: ai.model || '',
      api_key_env: ai.api_key_env || 'FISH_SCOUT_AI_API_KEY',
      max_input_chars: Number(ai.max_input_chars || 3000),
    },
    manual_links: listBlock(text, 'manual_links'),
  };
}
