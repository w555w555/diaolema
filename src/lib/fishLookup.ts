import { parseDuckDuckGoHtml } from './scout/publicSearch';

export type FishPublicNote = {
  name: string;
  summary: string;
  source: string;
  url: string;
};

const WIKI_TITLES: Record<string, string> = {
  鲫鱼: '鲫',
  鲤鱼: '鲤',
  草鱼: '草鱼',
  青鱼: '青鱼',
  鳊鱼: '长春鳊',
  鲮鱼: '鲮',
  黄颡鱼: '黄颡鱼',
  黄鱼: '小黄鱼',
  鲻鱼: '鲻鱼',
  鲈鱼: '花鲈',
  翘嘴: '翘嘴鲌',
  黑鱼: '乌鳢',
  鳜鱼: '鳜',
  鳡鱼: '鳡',
  红鳍鲌: '红鳍鲌',
  白条: '蓝刀鱼',
  罗非鱼: '罗非鱼',
  鲶鱼: '鲶鱼',
  塘鲺: '胡子鲶',
};

const UA = 'Yujian/1.0 (https://github.com; fishing-guide lookup)';

export function wikiTitleFor(name: string): string {
  return WIKI_TITLES[name] ?? name;
}

export function parseWikiSummary(data: unknown, name: string): FishPublicNote | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as {
    type?: string;
    extract?: string;
    description?: string;
    content_urls?: { desktop?: { page?: string } };
    title?: string;
  };
  const summary = (row.extract || row.description || '').replace(/\s+/g, ' ').trim();
  if (summary.length < 12) return null;
  const url = row.content_urls?.desktop?.page || `https://zh.wikipedia.org/wiki/${encodeURIComponent(wikiTitleFor(name))}`;
  return {
    name,
    summary: summary.slice(0, 420),
    source: '中文维基百科',
    url,
  };
}

export function parseSearchSnippets(hits: { title: string; snippet: string; url: string }[], name: string): FishPublicNote | null {
  const usable = hits.find((hit) => {
    const text = `${hit.title} ${hit.snippet}`;
    return text.includes(name) && hit.snippet.replace(/\s+/g, ' ').trim().length >= 18;
  });
  if (!usable) return null;
  return {
    name,
    summary: usable.snippet.replace(/\s+/g, ' ').trim().slice(0, 280),
    source: '公开搜索摘要',
    url: usable.url,
  };
}

async function fetchJson(url: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<unknown> {
  const res = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': UA }, signal });
  if (!res.ok) return null;
  return res.json();
}

async function fetchText(url: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<string> {
  const res = await fetchImpl(url, { headers: { 'user-agent': UA }, signal });
  if (!res.ok) return '';
  return res.text();
}

export async function lookupFishPublic(
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FishPublicNote | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const title = wikiTitleFor(trimmed);
    const wiki = parseWikiSummary(
      await fetchJson(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, fetchImpl, ctrl.signal),
      trimmed,
    );
    if (wiki) return wiki;
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${trimmed} 鱼类 习性`)}`, fetchImpl, ctrl.signal);
    return parseSearchSnippets(parseDuckDuckGoHtml(html), trimmed);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
