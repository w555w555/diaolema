import { describe, expect, it } from 'vitest';
import {
  cellText,
  createFeishuStore,
  fieldsFromPost,
  parseFeishuRecords,
  postFromFeishuFields,
} from './feishuCli';
import { createMemoryStore } from './memoryStore';
import { FEISHU_FIELDS } from './store';
import type { NewPostRow } from './types';

const sample: NewPostRow = {
  platform: 'xiaohongshu',
  platform_name: '小红书',
  url: 'https://www.xiaohongshu.com/explore/abc',
  title: '渔讯',
  snippet: '滴水湖鲈鱼',
  content: '',
  crawl_time: '2026-08-17T10:00:00',
  selected_location: '上海',
  city: '上海',
  location_text: '滴水湖',
  fish_species: '鲈鱼',
  fishing_method: '路亚',
  bait: '',
  catch_amount: '',
  confidence_score: 0.8,
  ai_summary: '',
  ai_location: '',
  ai_fish_species: '',
  ai_fishing_method: '',
  ai_bait: '',
  ai_catch_amount: '',
  ai_time_hint: '',
  ai_confidence_score: null,
  raw_text: '路亚阿周3小时前在滴水湖路亚中鲈鱼',
  author: '阿周',
  lon: 121.93,
  lat: 30.9,
};

describe('createMemoryStore', () => {
  it('插入后可按链接查重', async () => {
    const store = createMemoryStore();
    const first = await store.insert(sample);
    expect(first.id).toMatch(/^mem-/);
    expect(await store.findByUrl(sample.url)).toEqual(first);
    await expect(store.insert(sample)).rejects.toThrow(/UNIQUE/);
    expect((await store.list())[0].fish_species).toBe('鲈鱼');
  });
});

describe('parseFeishuRecords', () => {
  it('读 items.fields', () => {
    const rows = parseFeishuRecords({
      ok: true,
      data: {
        items: [
          {
            record_id: 'rec1',
            fields: {
              [FEISHU_FIELDS.url]: sample.url,
              [FEISHU_FIELDS.fish_species]: '鲈鱼',
              [FEISHU_FIELDS.author]: [{ text: '阿周' }],
              [FEISHU_FIELDS.lon]: 121.93,
            },
          },
        ],
      },
    });
    expect(rows[0].id).toBe('rec1');
    expect(rows[0].fish_species).toBe('鲈鱼');
    expect(rows[0].author).toBe('阿周');
    expect(rows[0].lon).toBe(121.93);
  });
});

describe('cellText', () => {
  it('拆飞书富文本数组', () => {
    expect(cellText([{ text: '滴' }, { text: '水湖' }])).toBe('滴水湖');
  });
});

describe('createFeishuStore', () => {
  it('list / findByUrl / insert 都走 lark-cli 参数', async () => {
    const calls: string[][] = [];
    const store = createFeishuStore(
      { baseToken: 'bas_test', tableId: 'tbl_test', identity: 'user' },
      async (args) => {
        calls.push(args);
        if (args.includes('+record-upsert')) {
          return { ok: true, data: { record: { record_id: 'rec9', fields: fieldsFromPost(sample) } } };
        }
        return {
          ok: true,
          data: { items: [{ record_id: 'rec1', fields: fieldsFromPost(sample) }], has_more: false },
        };
      },
    );
    expect((await store.list())[0].id).toBe('rec1');
    expect((await store.findByUrl(sample.url))?.fish_species).toBe('鲈鱼');
    expect((await store.insert(sample)).id).toBe('rec9');
    expect(calls[0].slice(0, 3)).toEqual(['base', '+record-list', '--base-token']);
    expect(calls[1].includes('--filter-json')).toBe(true);
    expect(calls[2].slice(0, 2)).toEqual(['base', '+record-upsert']);
  });
});

describe('postFromFeishuFields', () => {
  it('空字段给默认值', () => {
    const row = postFromFeishuFields('rec0', {});
    expect(row.url).toBe('');
    expect(row.confidence_score).toBe(0);
    expect(row.lon).toBeNull();
  });
});
