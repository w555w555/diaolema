import { mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_INGEST_CONFIG } from './config';
import { createMemoryStore } from './memoryStore';
import { savePost } from './savePost';

describe('savePost', () => {
  it('规则识别后写入 store 和归档，重复 url 不插入', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diaolema-'));
    const archiveDir = join(dir, 'captures');
    const store = createMemoryStore();
    const item = {
      url: 'https://news.example.com/dishuihu',
      title: '渔讯',
      snippet: '路亚阿周3小时前在滴水湖路亚中鲈鱼',
    };
    const first = await savePost(store, item, DEFAULT_INGEST_CONFIG, '上海', null, null, {
      fetchPageText: async () => '',
      aiExtractFishingInfo: async () => null,
      nowIso: () => '2026-08-17T10:00:00',
      archiveDir,
    });
    expect(first.inserted).toBe(true);
    expect(first.post?.fish_species).toBe('鲈鱼');
    expect(first.post?.location_text).toBe('滴水湖');
    expect(first.post?.fishing_method).toBe('路亚');
    expect(existsSync(archiveDir)).toBe(true);
    const files = readdirSync(archiveDir);
    expect(files.some((name) => name.endsWith('.json'))).toBe(true);
    expect(files.some((name) => name.endsWith('.md'))).toBe(true);

    const second = await savePost(store, item, DEFAULT_INGEST_CONFIG, '上海', null, null, {
      fetchPageText: async () => '',
      aiExtractFishingInfo: async () => null,
      archiveDir,
    });
    expect(second.inserted).toBe(false);
  });
});
