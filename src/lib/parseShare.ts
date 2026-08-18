import type { CatchSource } from '../types';
import { venueSpots } from './venues';

export type Spot = { name: string; lon: number; lat: number; aliases?: string[] };

export const SHANGHAI_SPOTS: Spot[] = [
  { name: '滴水湖', lon: 121.9335, lat: 30.9085 },
  { name: '淀山湖', lon: 120.996, lat: 31.121 },
  { name: '崇明北湖', lon: 121.357, lat: 31.737, aliases: ['北湖'] },
  { name: '明珠湖', lon: 121.458, lat: 31.623 },
  { name: '金海湿地', lon: 121.872, lat: 31.005, aliases: ['金海湿地公园'] },
  { name: '南汇嘴观海公园', lon: 121.847, lat: 30.851, aliases: ['南汇嘴'] },
  { name: '世纪公园', lon: 121.551, lat: 31.219 },
  { name: '共青森林公园', lon: 121.538, lat: 31.323, aliases: ['共青公园'] },
  { name: '大莲湖', lon: 121.052, lat: 31.068 },
  { name: '杨浦滨江', lon: 121.518, lat: 31.256, aliases: ['滨江'] },
  { name: '奉贤海湾', lon: 121.562, lat: 30.812, aliases: ['海湾'] },
  { name: '金山城市沙滩', lon: 121.341, lat: 30.704, aliases: ['金山沙滩'] },
  { name: '东平国家森林公园', lon: 121.479, lat: 31.686, aliases: ['东平森林公园'] },
  { name: '吴淞口', lon: 121.514, lat: 31.381 },
  { name: '青草沙', lon: 121.66, lat: 31.48 },
  { name: '夏阳湖', lon: 121.124, lat: 31.153 },
];

export const EXTRA_SPOTS: Spot[] = [
  { name: '阳澄湖', lon: 120.85, lat: 31.43 },
  { name: '太湖', lon: 120.22, lat: 31.17 },
  { name: '钱塘江', lon: 120.19, lat: 30.25 },
  { name: '密云水库', lon: 116.98, lat: 40.48 },
  { name: '十三陵水库', lon: 116.26, lat: 40.25 },
];

export const ALL_SPOTS: Spot[] = [...SHANGHAI_SPOTS, ...EXTRA_SPOTS, ...venueSpots()];

const FISH = ['黄颡鱼', '罗非鱼', '翘嘴', '白条', '鲈鱼', '鲫鱼', '鲤鱼', '草鱼', '青鱼', '鳊鱼', '黑鱼', '黄鱼', '桂鱼', '甲鱼', '鳜鱼', '马口', '鲢鳙'];

export function detectPlatform(text: string): CatchSource {
  if (/小红书|xiaohongshu|xhslink/i.test(text)) return 'xiaohongshu';
  if (/抖音|douyin|iesdouyin/i.test(text)) return 'douyin';
  if (/微博|weibo/i.test(text)) return 'weibo';
  if (/微信公众号|mp\.weixin|weixin\.qq/i.test(text)) return 'wechat';
  if (/bilibili|b23\.tv|哔哩/i.test(text)) return 'bilibili';
  if (/tieba\.baidu|贴吧/i.test(text)) return 'tieba';
  if (/zhihu\.com|知乎/i.test(text)) return 'zhihu';
  return 'public';
}

function extractUrl(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s]+/i);
  return m?.[0]?.replace(/[)，。]+$/, '');
}

function extractFish(text: string): string | undefined {
  return FISH.find((name) => text.includes(name));
}

function extractSpot(text: string): Spot | undefined {
  return ALL_SPOTS.find((spot) => {
    if (text.includes(spot.name)) return true;
    return spot.aliases?.some((a) => text.includes(a)) ?? false;
  });
}

function extractHoursAgo(text: string): number {
  if (/刚刚|刚才/.test(text)) return 0;
  const min = text.match(/(\d+)\s*分钟前/);
  if (min) return Number(min[1]) / 60;
  const hour = text.match(/(\d+)\s*小时前/);
  if (hour) return Number(hour[1]);
  if (/昨天/.test(text)) return 24;
  const day = text.match(/(\d+)\s*天前/);
  if (day) return Number(day[1]) * 24;
  return 3;
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

export type ParsedShare = {
  author: string;
  fish: string;
  spotName: string;
  lon: number;
  lat: number;
  source: CatchSource;
  hoursAgo: number;
  sourceUrl?: string;
  note: string;
};

export function parseShareText(text: string, fallback: { lon: number; lat: number }): ParsedShare | null {
  const raw = text.trim();
  if (!raw) return null;
  const fish = extractFish(raw);
  if (!fish) return null;
  const spot = extractSpot(raw);
  return {
    author: extractAuthor(raw),
    fish,
    spotName: spot?.name ?? '上海钓点',
    lon: spot?.lon ?? fallback.lon,
    lat: spot?.lat ?? fallback.lat,
    source: detectPlatform(raw),
    hoursAgo: extractHoursAgo(raw),
    sourceUrl: extractUrl(raw),
    note: raw.slice(0, 80),
  };
}
