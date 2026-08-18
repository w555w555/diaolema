import { describe, expect, it } from 'vitest';
import { buildDailyMarkdown } from './buildReport';
import type { ReportPost } from './types';

describe('buildDailyMarkdown', () => {
  it('按关注地点分组并区分手动链接与公开线索', () => {
    const posts: ReportPost[] = [
      {
        platform_name: '小红书',
        city: '上海',
        location_text: '滴水湖',
        fish_species: '鲈鱼',
        fishing_method: '路亚',
        bait: '米诺',
        title: '滴水湖路亚',
        snippet: '3小时前中鲈',
        url: 'https://www.xiaohongshu.com/explore/1',
        source_kind: 'public',
      },
      {
        platform_name: 'B站',
        city: '北京',
        location_text: '密云水库',
        fish_species: '翘嘴',
        fishing_method: '路亚',
        bait: '亮片',
        title: '密云翘嘴',
        snippet: '手动保存',
        url: 'https://www.bilibili.com/video/BV1',
        source_kind: 'manual',
      },
    ];
    const md = buildDailyMarkdown('2026-08-17', ['上海', '北京'], posts);
    expect(md).toContain('# 鱼情日报 2026-08-17');
    expect(md).toContain('## 上海');
    expect(md).toContain('## 北京');
    expect(md).toContain('公开线索');
    expect(md).toContain('手动链接');
    expect(md).toContain('鲈鱼');
    expect(md).toContain('密云水库');
    expect(md).toContain('标题：');
    expect(md).toContain('链接：');
  });
});
