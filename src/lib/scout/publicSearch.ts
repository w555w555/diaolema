import type { SearchHit, ScoutConfig } from './types';

export const PLATFORM_SITE_ALIASES: Record<string, string[]> = {
  'xiaohongshu.com': ['xiaohongshu.com', 'xhslink.com'],
  'douyin.com': ['douyin.com', 'iesdouyin.com'],
  'mp.weixin.qq.com': ['mp.weixin.qq.com', 'weixin.qq.com'],
  'bilibili.com': ['bilibili.com', 'b23.tv'],
  'tieba.baidu.com': ['tieba.baidu.com'],
  'zhihu.com': ['zhihu.com'],
};

export const ENABLED_SCOUT_SITES = [
  'xiaohongshu.com',
  'douyin.com',
  'mp.weixin.qq.com',
  'bilibili.com',
  'tieba.baidu.com',
  'zhihu.com',
] as const;

export const BAIDU_WEB_SEARCH_URL = 'https://qianfan.baidubce.com/v2/ai_search/web_search';

export function domainsForSite(site: string): string[] {
  return PLATFORM_SITE_ALIASES[site] ?? [site];
}

export type SearchQuery = {
  q: string;
  location: string;
  platformId: string;
  site: string;
};

export function enabledPlatforms(config: ScoutConfig): { id: string; name: string; site: string }[] {
  return Object.entries(config.platforms)
    .filter(([, p]) => p.enabled)
    .map(([id, p]) => ({ id, name: p.name, site: p.site }));
}

export function pickKeywords(config: ScoutConfig): string[] {
  const preferred = ['钓鱼', '渔获', '路亚', '野钓'];
  const pool = [...config.base_keywords, ...config.methods];
  const found = preferred.filter((k) => pool.includes(k));
  const extra = config.base_keywords.filter((k) => !found.includes(k));
  return [...found, ...extra].slice(0, 2);
}

export function buildSearchQueries(config: ScoutConfig, max = 24): SearchQuery[] {
  const primary = pickKeywords(config)[0] || '钓鱼';
  const queries: SearchQuery[] = [];
  for (const loc of config.selected_locations) {
    for (const p of enabledPlatforms(config)) {
      queries.push({
        q: `site:${p.site} ${loc} ${primary}`,
        location: loc,
        platformId: p.id,
        site: p.site,
      });
    }
  }
  return queries.slice(0, max);
}

export function hitMatchesEnabledPlatform(url: string, config: ScoutConfig): boolean {
  const hay = url.toLowerCase();
  return enabledPlatforms(config).some((p) => domainsForSite(p.site).some((d) => hay.includes(d.toLowerCase())));
}

export function hitMatchesQuerySite(url: string, site: string): boolean {
  const hay = url.toLowerCase();
  return domainsForSite(site).some((d) => hay.includes(d.toLowerCase()));
}

export function unwrapDuckHref(href: string): string {
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    if (uddg) return uddg;
  } catch {
    /* keep */
  }
  return href;
}

export function unwrapBingHref(href: string): string {
  try {
    const url = new URL(href, 'https://www.bing.com');
    const raw = url.searchParams.get('u');
    if (raw) {
      const b64 = raw.replace(/^a1/i, '').replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const decoded = atob(padded);
      const match = decoded.match(/https?:\/\/[^\s"']+/i);
      if (match) return match[0];
    }
  } catch {
    /* keep */
  }
  return href;
}

export function parseDuckDuckGoHtml(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const url = unwrapDuckHref(decodeHtml(match[1]));
    const title = stripTags(match[2]);
    const rest = html.slice(match.index, match.index + 1200);
    const snip = rest.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    hits.push({
      url,
      title,
      snippet: snip ? stripTags(snip[1]) : title,
    });
  }
  return finalizeHits(hits);
}

export function parseBingHtml(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const blocks = html.split(/<li[^>]*class="[^"]*\bb_algo\b[^"]*"/i).slice(1);
  for (const block of blocks) {
    const a = block.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const p = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    hits.push({
      url: unwrapBingHref(decodeHtml(a[1])),
      title: stripTags(a[2]),
      snippet: p ? stripTags(p[1]) : stripTags(a[2]),
    });
  }
  return finalizeHits(hits);
}

export function parseBaiduHtml(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const re = /<h3[^>]*>\s*<a([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const attrs = match[1];
    const mu = attrs.match(/\bmu="([^"]+)"/i);
    const href = attrs.match(/\bhref="([^"]+)"/i);
    const url = decodeHtml(mu?.[1] || href?.[1] || '');
    if (!url) continue;
    const title = stripTags(match[2]);
    const rest = html.slice(match.index, match.index + 1600);
    const snip = rest.match(/class="(?:c-abstract|content-right_[^"]+)"[^>]*>([\s\S]*?)<\/(?:div|span)>/i);
    hits.push({
      url,
      title,
      snippet: snip ? stripTags(snip[1]) : title,
    });
  }
  return finalizeHits(hits);
}

export function parseSogouWeixinHtml(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const re = /<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const url = decodeHtml(match[1]);
    const title = stripTags(match[2]);
    const rest = html.slice(match.index, match.index + 1600);
    const snip = rest.match(/class="txt-info"[^>]*>([\s\S]*?)<\/p>/i);
    hits.push({
      url,
      title,
      snippet: snip ? stripTags(snip[1]) : title,
    });
  }
  return finalizeHits(hits);
}

export function parseBaiduApiResponse(data: unknown): SearchHit[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as { code?: unknown; references?: unknown; results?: unknown };
  if (obj.code != null) return [];
  const refs = Array.isArray(obj.references) ? obj.references : Array.isArray(obj.results) ? obj.results : [];
  const hits: SearchHit[] = [];
  for (const ref of refs) {
    if (!ref || typeof ref !== 'object') continue;
    const item = ref as { url?: string; title?: string; content?: string; snippet?: string };
    hits.push({
      url: item.url || '',
      title: item.title || '',
      snippet: item.content || item.snippet || item.title || '',
    });
  }
  return finalizeHits(hits);
}

export async function searchBaiduWebApi(
  query: string,
  sites: string[],
  fetchImpl: typeof fetch,
  apiKey: string,
): Promise<SearchHit[]> {
  const payload: Record<string, unknown> = {
    messages: [{ role: 'user', content: query.slice(0, 72) }],
    search_source: 'baidu_search_v2',
    resource_type_filter: [{ type: 'web', top_k: 10 }],
    safe_search: false,
    search_recency_filter: 'week',
  };
  if (sites.length) {
    payload.search_filter = { match: { site: sites.slice(0, 100) } };
  }
  const res = await fetchImpl(BAIDU_WEB_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appbuilder-Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  try {
    return parseBaiduApiResponse(await res.json());
  } catch {
    return [];
  }
}

function finalizeHits(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const hit of hits) {
    if (!/^https?:\/\//i.test(hit.url) || seen.has(hit.url)) continue;
    if (/bing\.com|duckduckgo\.com|baidu\.com\/s\?|sogou\.com\/weixin|wx\.sogou\.com/i.test(hit.url)) continue;
    seen.add(hit.url);
    out.push(hit);
  }
  return out.slice(0, 10);
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export type SearchDeps = {
  fetchImpl?: typeof fetch;
  delayMs?: number;
  baiduApiKey?: string;
};

async function fetchHtml(fetchImpl: typeof fetch, url: string): Promise<string> {
  const res = await fetchImpl(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  });
  if (!res.ok) return '';
  return res.text();
}

function filterHitsForQuery(hits: SearchHit[], site: string): SearchHit[] {
  return hits.filter((hit) => hitMatchesQuerySite(hit.url, site));
}

async function searchOneQuery(
  query: SearchQuery,
  fetchImpl: typeof fetch,
  baiduApiKey: string,
): Promise<SearchHit[]> {
  if (baiduApiKey) {
    try {
      const apiHits = filterHitsForQuery(
        await searchBaiduWebApi(query.q, domainsForSite(query.site), fetchImpl, baiduApiKey),
        query.site,
      );
      if (apiHits.length) return apiHits;
    } catch {
      /* next engine */
    }
  }

  const engines: Array<() => Promise<SearchHit[]>> = [
    async () =>
      parseBingHtml(
        await fetchHtml(fetchImpl, `https://cn.bing.com/search?q=${encodeURIComponent(query.q)}&setlang=zh-Hans`),
      ),
    async () => parseBaiduHtml(await fetchHtml(fetchImpl, `https://www.baidu.com/s?wd=${encodeURIComponent(query.q)}`)),
  ];
  if (query.site === 'mp.weixin.qq.com') {
    const wechatQ = `${query.location} 钓鱼`;
    engines.push(async () =>
      parseSogouWeixinHtml(
        await fetchHtml(fetchImpl, `https://wx.sogou.com/weixin?type=2&query=${encodeURIComponent(wechatQ)}`),
      ),
    );
  }
  engines.push(async () =>
    parseDuckDuckGoHtml(await fetchHtml(fetchImpl, `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.q)}`)),
  );

  for (const run of engines) {
    try {
      const matched = filterHitsForQuery(await run(), query.site);
      if (matched.length) return matched;
    } catch {
      /* next engine */
    }
  }
  return [];
}

export async function searchPublicClues(config: ScoutConfig, deps: SearchDeps = {}): Promise<SearchHit[]> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const delayMs = deps.delayMs ?? 1000;
  const baiduApiKey = deps.baiduApiKey ?? '';
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const query of buildSearchQueries(config)) {
    const parsed = await searchOneQuery(query, fetchImpl, baiduApiKey);
    for (const hit of parsed) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      out.push({
        ...hit,
        query: query.q,
        location: query.location,
      });
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }
  return out.slice(0, 40);
}
