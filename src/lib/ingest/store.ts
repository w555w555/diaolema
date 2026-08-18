export const FEISHU_TABLE_NAME = '渔获情报';

export const FEISHU_FIELDS = {
  url: '链接',
  platform: '平台',
  platform_name: '平台名',
  title: '标题',
  snippet: '摘要',
  content: '正文',
  crawl_time: '入库时间',
  selected_location: '查询地点',
  city: '城市',
  location_text: '钓点',
  fish_species: '鱼种',
  fishing_method: '钓法',
  bait: '鱼饵',
  catch_amount: '渔获量',
  confidence_score: '置信度',
  ai_summary: 'AI综述',
  ai_location: 'AI地点',
  ai_fish_species: 'AI鱼种',
  ai_fishing_method: 'AI钓法',
  ai_bait: 'AI鱼饵',
  ai_catch_amount: 'AI渔获量',
  ai_time_hint: 'AI时间',
  ai_confidence_score: 'AI置信度',
  raw_text: '原文',
  author: '作者',
  lon: '经度',
  lat: '纬度',
} as const;

export type FeishuFieldKey = keyof typeof FEISHU_FIELDS;

export type FeishuDbConfig = {
  baseToken: string;
  tableId: string;
  identity: 'user' | 'bot';
};

export function feishuDbConfigured(env: Record<string, string | undefined>): boolean {
  return Boolean(env.FEISHU_BASE_TOKEN?.trim() && env.FEISHU_TABLE_ID?.trim());
}

export function feishuDbConfigFromEnv(env: Record<string, string | undefined>): FeishuDbConfig {
  const baseToken = env.FEISHU_BASE_TOKEN?.trim() ?? '';
  const tableId = env.FEISHU_TABLE_ID?.trim() ?? '';
  if (!baseToken || !tableId) {
    const err = new Error('feishu_not_configured');
    err.name = 'FeishuNotConfigured';
    throw err;
  }
  return {
    baseToken,
    tableId,
    identity: env.FEISHU_AS === 'bot' ? 'bot' : 'user',
  };
}

export const TABLE_FIELDS: { name: string; type: string }[] = [
  { name: FEISHU_FIELDS.url, type: 'url' },
  { name: FEISHU_FIELDS.platform, type: 'text' },
  { name: FEISHU_FIELDS.platform_name, type: 'text' },
  { name: FEISHU_FIELDS.title, type: 'text' },
  { name: FEISHU_FIELDS.snippet, type: 'text' },
  { name: FEISHU_FIELDS.content, type: 'text' },
  { name: FEISHU_FIELDS.crawl_time, type: 'datetime' },
  { name: FEISHU_FIELDS.selected_location, type: 'text' },
  { name: FEISHU_FIELDS.city, type: 'text' },
  { name: FEISHU_FIELDS.location_text, type: 'text' },
  { name: FEISHU_FIELDS.fish_species, type: 'text' },
  { name: FEISHU_FIELDS.fishing_method, type: 'text' },
  { name: FEISHU_FIELDS.bait, type: 'text' },
  { name: FEISHU_FIELDS.catch_amount, type: 'text' },
  { name: FEISHU_FIELDS.confidence_score, type: 'number' },
  { name: FEISHU_FIELDS.ai_summary, type: 'text' },
  { name: FEISHU_FIELDS.ai_location, type: 'text' },
  { name: FEISHU_FIELDS.ai_fish_species, type: 'text' },
  { name: FEISHU_FIELDS.ai_fishing_method, type: 'text' },
  { name: FEISHU_FIELDS.ai_bait, type: 'text' },
  { name: FEISHU_FIELDS.ai_catch_amount, type: 'text' },
  { name: FEISHU_FIELDS.ai_time_hint, type: 'text' },
  { name: FEISHU_FIELDS.ai_confidence_score, type: 'number' },
  { name: FEISHU_FIELDS.raw_text, type: 'text' },
  { name: FEISHU_FIELDS.author, type: 'text' },
  { name: FEISHU_FIELDS.lon, type: 'number' },
  { name: FEISHU_FIELDS.lat, type: 'number' },
];
