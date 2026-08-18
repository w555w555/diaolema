import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PostRow } from './types';

function safeName(value: string): string {
  return value.replace(/[<>:"/\\|?*\s]+/g, '_').replace(/_+/g, '_').slice(0, 40);
}

export function archivePost(dir: string, post: PostRow): string {
  mkdirSync(dir, { recursive: true });
  const stamp = (post.crawl_time || new Date().toISOString()).replace(/[:.]/g, '-').slice(0, 19);
  const slug = safeName([post.platform_name, post.location_text, post.fish_species, `id${post.id}`].filter(Boolean).join('-'));
  const base = join(dir, `${stamp}-${slug}`);
  writeFileSync(`${base}.json`, JSON.stringify(post, null, 2), 'utf8');
  writeFileSync(
    `${base}.md`,
    [
      `# ${post.platform_name || '渔讯'} ${post.location_text || ''} ${post.fish_species || ''}`.trim(),
      '',
      `- 时间：${post.crawl_time}`,
      `- 平台：${post.platform_name}`,
      `- 链接：${post.url}`,
      `- 地点：${post.city} ${post.location_text}`.trim(),
      `- 鱼种：${post.fish_species}`,
      `- 钓法：${post.fishing_method}`,
      `- 鱼饵：${post.bait}`,
      `- 渔获量：${post.catch_amount}`,
      '',
      '## 原文',
      '',
      post.raw_text || post.snippet || post.title || '',
      '',
    ].join('\n'),
    'utf8',
  );
  return base;
}
