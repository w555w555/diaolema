import { describe, expect, it } from 'vitest';
import {
  BAIDU_WEB_SEARCH_URL,
  buildSearchQueries,
  ENABLED_SCOUT_SITES,
  hitMatchesEnabledPlatform,
  hitMatchesQuerySite,
  parseBaiduApiResponse,
  parseBaiduHtml,
  parseBingHtml,
  parseDuckDuckGoHtml,
  parseSogouWeixinHtml,
  searchPublicClues,
  unwrapBingHref,
} from './publicSearch';
import type { ScoutConfig } from './types';

const sample: ScoutConfig = {
  storage: { output_dir: './fish_scout_data', db_name: 'fish_scout.db', report_dir: 'reports', post_archive_dir: 'posts' },
  selected_locations: ['上海', '北京'],
  locations: ['上海', '北京'],
  platforms: {
    xiaohongshu: { enabled: true, name: '小红书', site: 'xiaohongshu.com' },
    douyin: { enabled: true, name: '抖音', site: 'douyin.com' },
    bilibili: { enabled: true, name: 'B站', site: 'bilibili.com' },
    wechat: { enabled: false, name: '微信公众号', site: 'mp.weixin.qq.com' },
  },
  base_keywords: ['钓鱼', '野钓', '路亚', '渔获'],
  fish_species: ['鲈鱼'],
  methods: ['路亚'],
  baits: ['米诺'],
  ai: { enabled: false, base_url: '', model: '', api_key_env: '', max_input_chars: 3000 },
  manual_links: [],
};

describe('buildSearchQueries', () => {
  it('按城市、已启用平台、关键词生成 site 查询', () => {
    const queries = buildSearchQueries(sample).map((item) => item.q);
    expect(queries.some((q) => q.includes('site:xiaohongshu.com') && q.includes('上海') && q.includes('钓鱼'))).toBe(true);
    expect(queries.some((q) => q.includes('site:douyin.com') && q.includes('北京'))).toBe(true);
    expect(queries.some((q) => q.includes('site:bilibili.com'))).toBe(true);
    expect(queries.every((q) => !q.includes('mp.weixin.qq.com'))).toBe(true);
    expect(queries.length).toBeLessThanOrEqual(24);
  });

  it('六个已启用平台都会生成 site 查询', () => {
    const allOn: ScoutConfig = {
      ...sample,
      platforms: {
        xiaohongshu: { enabled: true, name: '小红书', site: 'xiaohongshu.com' },
        douyin: { enabled: true, name: '抖音', site: 'douyin.com' },
        wechat: { enabled: true, name: '微信公众号', site: 'mp.weixin.qq.com' },
        bilibili: { enabled: true, name: 'B站', site: 'bilibili.com' },
        tieba: { enabled: true, name: '贴吧', site: 'tieba.baidu.com' },
        zhihu: { enabled: true, name: '知乎', site: 'zhihu.com' },
      },
    };
    const sites = buildSearchQueries(allOn).map((item) => item.site);
    for (const site of ENABLED_SCOUT_SITES) {
      expect(sites).toContain(site);
    }
  });
});

describe('hitMatchesEnabledPlatform', () => {
  it('只收下已启用平台的链接', () => {
    expect(hitMatchesEnabledPlatform('https://www.bilibili.com/video/1', sample)).toBe(true);
    expect(hitMatchesEnabledPlatform('https://www.xiaohongshu.com/explore/1', sample)).toBe(true);
    expect(hitMatchesEnabledPlatform('https://xhslink.com/abc', sample)).toBe(true);
    expect(hitMatchesEnabledPlatform('https://v.douyin.com/xxx', sample)).toBe(true);
    expect(hitMatchesEnabledPlatform('https://mp.weixin.qq.com/s/1', sample)).toBe(false);
    expect(hitMatchesEnabledPlatform('https://example.com/a', sample)).toBe(false);
  });
});

describe('hitMatchesQuerySite', () => {
  it('只匹配当前查询站点及其别名', () => {
    expect(hitMatchesQuerySite('https://www.xiaohongshu.com/explore/1', 'xiaohongshu.com')).toBe(true);
    expect(hitMatchesQuerySite('https://xhslink.com/abc', 'xiaohongshu.com')).toBe(true);
    expect(hitMatchesQuerySite('https://www.zhihu.com/question/1', 'xiaohongshu.com')).toBe(false);
    expect(hitMatchesQuerySite('https://www.bilibili.com/video/1', 'bilibili.com')).toBe(true);
  });
});

describe('parseDuckDuckGoHtml', () => {
  it('抽出标题、链接、摘要', () => {
    const html = `
      <a class="result__a" href="https://www.bilibili.com/video/BV1">上海路亚鲈鱼</a>
      <a class="result__snippet">滴水湖今天路亚中鲈鱼</a>
    `;
    const hits = parseDuckDuckGoHtml(html);
    expect(hits[0]?.url).toContain('bilibili.com');
    expect(hits[0]?.title).toContain('鲈鱼');
    expect(hits[0]?.snippet).toContain('滴水湖');
  });
});

describe('parseBingHtml', () => {
  it('抽出 Bing 公开结果的标题、摘要、链接', () => {
    const html = `
      <li class="b_algo">
        <h2><a href="https://www.xiaohongshu.com/explore/abc">上海滴水湖路亚</a></h2>
        <div class="b_caption"><p>有人钓到了鲈鱼</p></div>
      </li>
    `;
    const hits = parseBingHtml(html);
    expect(hits[0]?.url).toContain('xiaohongshu.com');
    expect(hits[0]?.title).toContain('滴水湖');
    expect(hits[0]?.snippet).toContain('鲈鱼');
  });
});

describe('parseBaiduHtml', () => {
  it('优先用 mu 真实链接抽出标题和摘要', () => {
    const html = `
      <h3 class="t"><a href="https://www.baidu.com/link?url=x" mu="https://www.bilibili.com/video/BV1">上海路亚</a></h3>
      <div class="c-abstract">滴水湖鲈鱼</div>
    `;
    const hits = parseBaiduHtml(html);
    expect(hits[0]?.url).toContain('bilibili.com');
    expect(hits[0]?.title).toContain('路亚');
    expect(hits[0]?.snippet).toContain('鲈鱼');
  });
});

describe('parseSogouWeixinHtml', () => {
  it('抽出公众号文章标题、链接、摘要', () => {
    const html = `
      <h3><a href="https://mp.weixin.qq.com/s/abc">上海夜钓</a></h3>
      <p class="txt-info">滨江有人钓到了鲈鱼</p>
    `;
    const hits = parseSogouWeixinHtml(html);
    expect(hits[0]?.url).toContain('mp.weixin.qq.com');
    expect(hits[0]?.title).toContain('夜钓');
    expect(hits[0]?.snippet).toContain('鲈鱼');
  });
});

describe('parseBaiduApiResponse', () => {
  it('从千帆 references 抽出标题、链接、摘要', () => {
    const hits = parseBaiduApiResponse({
      references: [{ title: '上海钓鱼', url: 'https://www.bilibili.com/video/1', content: '滴水湖路亚' }],
    });
    expect(hits[0]?.url).toContain('bilibili.com');
    expect(hits[0]?.snippet).toContain('滴水湖');
  });
});

describe('searchPublicClues', () => {
  it('保存搜索结果的标题、摘要、链接和查询地点', async () => {
    const hits = await searchPublicClues(sample, {
      delayMs: 0,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes('bing.com') && url.includes('bilibili.com')) {
          return new Response(
            `<li class="b_algo"><h2><a href="https://www.bilibili.com/video/BV1">上海钓鱼</a></h2><p>滴水湖路亚摘要</p></li>`,
          );
        }
        return new Response('');
      },
    });
    expect(hits.some((h) => h.url.includes('bilibili.com') && h.snippet.includes('滴水湖') && h.location === '上海')).toBe(
      true,
    );
    expect(hits[0]?.query).toContain('site:');
  });

  it('丢弃不属于当前查询站点的结果，再尝试后续引擎', async () => {
    const hits = await searchPublicClues(sample, {
      delayMs: 0,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes('bing.com')) {
          return new Response(
            `<li class="b_algo"><h2><a href="https://www.zhihu.com/question/1">北京旅游</a></h2><p>景点</p></li>`,
          );
        }
        if (url.includes('duckduckgo.com') && url.includes('xiaohongshu.com')) {
          return new Response(`
            <a class="result__a" href="https://www.xiaohongshu.com/explore/1">上海钓鱼</a>
            <a class="result__snippet">滴水湖路亚</a>
          `);
        }
        return new Response('');
      },
    });
    expect(hits.every((h) => !h.url.includes('zhihu.com'))).toBe(true);
    expect(hits.some((h) => h.url.includes('xiaohongshu.com') && h.location === '上海')).toBe(true);
  });

  it('有千帆 Key 时优先用百度 API 且按站点过滤', async () => {
    const hits = await searchPublicClues(sample, {
      delayMs: 0,
      baiduApiKey: 'bce-v3/test',
      fetchImpl: async (input, init) => {
        const url = String(input);
        if (url === BAIDU_WEB_SEARCH_URL) {
          const body = JSON.parse(String(init?.body || '{}')) as {
            messages?: { content?: string }[];
            search_filter?: { match?: { site?: string[] } };
          };
          const q = body.messages?.[0]?.content || '';
          const sites = body.search_filter?.match?.site || [];
          if (q.includes('bilibili.com') && sites.some((s) => s.includes('bilibili.com'))) {
            return new Response(
              JSON.stringify({
                references: [{ title: '上海钓鱼', url: 'https://www.bilibili.com/video/BV1', content: '滴水湖路亚' }],
              }),
              { headers: { 'content-type': 'application/json' } },
            );
          }
          return new Response(JSON.stringify({ references: [] }), {
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response('');
      },
    });
    expect(hits.some((h) => h.url.includes('bilibili.com') && h.snippet.includes('滴水湖'))).toBe(true);
  });
});

describe('unwrapBingHref', () => {
  it('还原 Bing 跳转参数里的目标链接', () => {
    const encoded = btoa('https://www.bilibili.com/video/BV1');
    const href = `https://www.bing.com/ck/a?u=a1${encoded}`;
    expect(unwrapBingHref(href)).toContain('bilibili.com');
  });
});
