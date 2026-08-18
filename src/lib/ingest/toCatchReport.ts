import { SHANGHAI_CENTER, type CatchReport, type CatchSource } from '../../types';
import { ALL_SPOTS } from '../parseShare';
import type { PostRow } from './types';

const CITY_CENTERS: Record<string, { lon: number; lat: number }> = {
  上海: { lon: 121.473701, lat: 31.230416 },
  北京: { lon: 116.4074, lat: 39.9042 },
  苏州: { lon: 120.6196, lat: 31.299 },
  杭州: { lon: 120.1551, lat: 30.2741 },
  南京: { lon: 118.7969, lat: 32.0603 },
  天津: { lon: 117.2008, lat: 39.0842 },
};

function asSource(platform: string): CatchSource {
  if (
    platform === 'xiaohongshu' ||
    platform === 'douyin' ||
    platform === 'weibo' ||
    platform === 'wechat' ||
    platform === 'bilibili' ||
    platform === 'tieba' ||
    platform === 'zhihu'
  ) {
    return platform;
  }
  if (platform === 'news') return 'news';
  if (platform === 'user') return 'user';
  return 'public';
}

function extractAuthor(text: string): string {
  const at = text.match(/@([^\s【】:：]{2,12})/);
  if (at) return at[1];
  const pub = text.match(/([^\s，。！!@]{2,12})\s*(?:发布了|分享了|在小红书|在抖音)/);
  if (pub) return pub[1];
  const atSpot = text.match(/([^\s，。]{2,8})(?:在|于)/);
  if (atSpot) return atSpot[1];
  return '钓友';
}

export function postToCatchReport(post: PostRow, fallback = SHANGHAI_CENTER): CatchReport {
  const blob = `${post.title} ${post.snippet} ${post.raw_text}`;
  const spot = ALL_SPOTS.find((s) => {
    const loc = post.location_text || post.city;
    return loc === s.name || s.aliases?.includes(loc) || blob.includes(s.name);
  });
  const city = CITY_CENTERS[post.city] || CITY_CENTERS[post.location_text];
  return {
    id: `db-${post.id}`,
    author: post.author || extractAuthor(blob),
    fish: post.fish_species || '渔获',
    spotName: spot?.name || post.location_text || post.city || '钓点',
    lon: post.lon ?? spot?.lon ?? city?.lon ?? fallback.lon,
    lat: post.lat ?? spot?.lat ?? city?.lat ?? fallback.lat,
    caughtAt: post.crawl_time ? new Date(post.crawl_time).toISOString() : new Date().toISOString(),
    source: asSource(post.platform),
    note: post.ai_summary || post.snippet || post.title || undefined,
    sourceUrl: post.url?.startsWith('http') ? post.url : undefined,
  };
}

export function catchReportToPost(report: CatchReport): Omit<PostRow, 'id'> {
  return {
    platform: report.source === 'public' ? 'news' : report.source,
    platform_name: report.source === 'user' ? '钓友上报' : report.source,
    url: report.sourceUrl || `local://${report.id}`,
    title: `${report.author} 钓到了${report.fish}`,
    snippet: report.note || '',
    content: '',
    crawl_time: report.caughtAt,
    selected_location: report.spotName,
    city: '',
    location_text: report.spotName,
    fish_species: report.fish,
    fishing_method: '',
    bait: '',
    catch_amount: '',
    confidence_score: 1,
    ai_summary: report.note || '',
    ai_location: report.spotName,
    ai_fish_species: report.fish,
    ai_fishing_method: '',
    ai_bait: '',
    ai_catch_amount: '',
    ai_time_hint: '',
    ai_confidence_score: null,
    raw_text: `${report.author} ${report.spotName} ${report.fish} ${report.note || ''}`.trim(),
    author: report.author,
    lon: report.lon,
    lat: report.lat,
  };
}

