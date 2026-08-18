import type { IngestConfig } from './config';

export type FetchPageDeps = {
  fetchImpl?: typeof fetch;
};

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGatedUrl(url: string, config: IngestConfig): boolean {
  const hay = (url || '').toLowerCase();
  return config.gated_domains.some((d) => hay.includes(d.toLowerCase()));
}

export async function fetchPageText(
  url: string,
  config: IngestConfig,
  deps: FetchPageDeps = {},
): Promise<string> {
  if (!url || !/^https?:\/\//i.test(url) || isGatedUrl(url, config)) return '';
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const raw = await res.text();
    return htmlToText(raw).slice(0, 20000);
  } catch {
    return '';
  }
}
