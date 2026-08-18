import { describe, expect, it } from 'vitest';
import { parseScoutYaml } from './parseYaml';

const yaml = `
storage:
  output_dir: "./fish_scout_data"
  db_name: "fish_scout.db"
  report_dir: "reports"
  post_archive_dir: "posts"
selected_locations:
  - "上海"
  - "北京"
platforms:
  xiaohongshu:
    enabled: true
    name: "小红书"
    site: "xiaohongshu.com"
  bilibili:
    enabled: true
    name: "B站"
    site: "bilibili.com"
base_keywords:
  - "钓鱼"
fish_species:
  - "鲈鱼"
methods:
  - "路亚"
baits:
  - "米诺"
ai:
  enabled: true
  base_url: "https://api.deepseek.com"
  model: "deepseek-chat"
  api_key_env: "FISH_SCOUT_AI_API_KEY"
  max_input_chars: 3000
manual_links: []
`;

describe('parseScoutYaml', () => {
  it('读出存储路径、关注地点和平台', () => {
    const cfg = parseScoutYaml(yaml);
    expect(cfg.storage.db_name).toBe('fish_scout.db');
    expect(cfg.selected_locations).toEqual(['上海', '北京']);
    expect(cfg.platforms.xiaohongshu).toEqual({ enabled: true, name: '小红书', site: 'xiaohongshu.com' });
    expect(cfg.platforms.bilibili.name).toBe('B站');
    expect(cfg.ai.api_key_env).toBe('FISH_SCOUT_AI_API_KEY');
    expect(cfg.ai.max_input_chars).toBe(3000);
  });
});
