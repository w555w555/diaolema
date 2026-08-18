import type { CatchReport } from '../types';

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round((now.getTime() - then) / 60000));
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  return `${days}天前`;
}

export function formatCatchCaption(report: CatchReport, now: Date = new Date()): string {
  return `${report.author} ${formatRelativeTime(report.caughtAt, now)} 钓到了${report.fish}`;
}

export function sourceLabel(source: CatchReport['source']): string {
  if (source === 'user') return '钓友上报';
  if (source === 'xiaohongshu') return '小红书';
  if (source === 'douyin') return '抖音';
  if (source === 'weibo') return '微博';
  if (source === 'wechat') return '微信公众号';
  if (source === 'bilibili') return 'B站';
  if (source === 'tieba') return '贴吧';
  if (source === 'zhihu') return '知乎';
  if (source === 'news') return '公开渔讯';
  if (source === 'public') return '公开渔讯';
  return '渔讯整理';
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[ch];
  });
}
