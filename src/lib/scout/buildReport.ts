import type { ReportPost } from './types';

const SHANGHAI_HINTS = ['滴水湖', '淀山湖', '崇明', '浦东', '吴淞口', '杨浦滨江', '金海湿地'];
const BEIJING_HINTS = ['密云水库', '十三陵水库', '密云', '十三陵'];

export function bucketLocation(post: Pick<ReportPost, 'city' | 'location_text' | 'title' | 'snippet'>, selected: string[]): string {
  const blob = `${post.city} ${post.location_text} ${post.title} ${post.snippet}`;
  for (const loc of selected) {
    if (blob.includes(loc)) return loc;
  }
  if (selected.includes('上海') && SHANGHAI_HINTS.some((h) => blob.includes(h))) return '上海';
  if (selected.includes('北京') && BEIJING_HINTS.some((h) => blob.includes(h))) return '北京';
  return '其他';
}

export function buildDailyMarkdown(date: string, selectedLocations: string[], posts: ReportPost[]): string {
  const publicCount = posts.filter((p) => p.source_kind === 'public').length;
  const manualCount = posts.filter((p) => p.source_kind === 'manual').length;
  const lines = [
    `# 鱼情日报 ${date}`,
    '',
    `关注地点：${selectedLocations.join('、') || '未指定'}`,
    `今日整理：${posts.length} 条（公开线索 ${publicCount} / 手动链接 ${manualCount}）`,
    '',
    '说明：小红书、抖音、微信公众号、知乎只收录公开搜索摘要或你保存的链接，不登录抓取正文。',
    '',
  ];

  const groups = [...selectedLocations, '其他'];
  for (const name of groups) {
    const rows = posts.filter((p) => bucketLocation(p, selectedLocations) === name);
    if (!rows.length) continue;
    lines.push(`## ${name}`, '');
    for (const p of rows) {
      const kind = p.source_kind === 'manual' ? '手动链接' : '公开线索';
      const where = [p.location_text, p.city].filter(Boolean).join(' · ');
      const what = [p.fish_species, p.fishing_method, p.bait].filter(Boolean).join(' / ');
      lines.push(`- 【${kind} · ${p.platform_name}】${where || '地点未识别'}｜${what || '鱼种未识别'}`);
      if (p.title) lines.push(`  标题：${p.title}`);
      if (p.snippet) lines.push(`  摘要：${p.snippet}`);
      if (p.url) lines.push(`  链接：${p.url}`);
    }
    lines.push('');
  }

  if (!posts.length) {
    lines.push('今日暂无新线索。把分享口令或公开链接保存进来后，重新生成日报。', '');
  }
  return lines.join('\n');
}
