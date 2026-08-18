import { SHANGHAI_SPOTS } from '../parseShare';

export type IngestPlatform = {
  id: string;
  name: string;
  domains: string[];
};

export type IngestConfig = {
  platforms: IngestPlatform[];
  cities: string[];
  spots: { name: string; aliases?: string[] }[];
  fish_species: string[];
  fishing_methods: string[];
  baits: string[];
  gated_domains: string[];
  ai: {
    enabled: boolean;
    base_url: string;
    api_key: string;
    model: string;
    max_input_chars?: number;
  };
};

export const DEFAULT_INGEST_CONFIG: IngestConfig = {
  platforms: [
    { id: 'xiaohongshu', name: '小红书', domains: ['xiaohongshu.com', 'xhslink.com'] },
    { id: 'douyin', name: '抖音', domains: ['douyin.com', 'iesdouyin.com'] },
    { id: 'weibo', name: '微博', domains: ['weibo.com', 'weibo.cn'] },
    { id: 'wechat', name: '微信公众号', domains: ['mp.weixin.qq.com', 'weixin.qq.com'] },
    { id: 'bilibili', name: 'B站', domains: ['bilibili.com', 'b23.tv'] },
    { id: 'tieba', name: '贴吧', domains: ['tieba.baidu.com'] },
    { id: 'zhihu', name: '知乎', domains: ['zhihu.com'] },
  ],
  cities: ['上海', '浦东', '浦西', '崇明', '青浦', '松江', '金山', '奉贤', '嘉定', '宝山', '闵行', '杨浦', '虹口'],
  spots: SHANGHAI_SPOTS.map((s) => ({ name: s.name, aliases: s.aliases })),
  fish_species: [
    '黄颡鱼',
    '罗非鱼',
    '翘嘴',
    '白条',
    '鲈鱼',
    '鲫鱼',
    '鲤鱼',
    '草鱼',
    '青鱼',
    '鳊鱼',
    '黑鱼',
    '黄鱼',
    '桂鱼',
    '甲鱼',
  ],
  fishing_methods: ['路亚', '台钓', '传统钓', '夜钓', '筏钓', '海钓', '矶钓', '抛竿', '前打'],
  baits: ['蚯蚓', '红虫', '玉米', '商品饵', '米诺', '亮片', '活虾', '螺蛳', '拉饵', '搓饵', '波扒', '铅笔'],
  gated_domains: [
    'xiaohongshu.com',
    'xhslink.com',
    'douyin.com',
    'iesdouyin.com',
    'weibo.com',
    'weibo.cn',
    'mp.weixin.qq.com',
    'weixin.qq.com',
    'zhihu.com',
  ],
  ai: {
    enabled: false,
    base_url: '',
    api_key: '',
    model: '',
    max_input_chars: 3000,
  },
};
