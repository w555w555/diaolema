import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAppStore } from '../ingest/db';
import { isGatedUrl } from '../ingest/fetchPage';
import { savePost } from '../ingest/savePost';
import type { PostRow, PostStore } from '../ingest/types';
import { buildDailyMarkdown } from './buildReport';
import { fetchPageTextWithDefuddle } from './extractPublic';
import { loadBaiduSearchApiKey, loadScoutConfig, scoutPaths, toIngestConfig } from './loadConfig';
import { buildSearchQueries, searchPublicClues, type SearchHit } from './publicSearch';
import type { ReportPost, ScoutConfig } from './types';

export function shanghaiDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

function toReportPost(row: PostRow, manual: Set<string>): ReportPost {
  return {
    platform_name: row.platform_name,
    city: row.city,
    location_text: row.location_text,
    fish_species: row.fish_species,
    fishing_method: row.fishing_method,
    bait: row.bait,
    title: row.title,
    snippet: row.snippet,
    url: row.url,
    source_kind: manual.has(row.url) ? 'manual' : 'public',
  };
}

export type DailyScoutDeps = {
  searchFn?: (config: ScoutConfig) => Promise<SearchHit[]>;
  now?: Date;
  skipSearch?: boolean;
  store?: PostStore;
};

export async function runDailyScout(root = process.cwd(), deps: DailyScoutDeps = {}) {
  const config = loadScoutConfig(root);
  const paths = scoutPaths(root, config);
  const ingest = toIngestConfig(config, root);
  const store = deps.store ?? createAppStore(root);
  const saveDeps = { archiveDir: paths.posts, fetchPageText: fetchPageTextWithDefuddle };
  const date = shanghaiDate(deps.now ?? new Date());
  mkdirSync(paths.reports, { recursive: true });
  mkdirSync(paths.posts, { recursive: true });
  mkdirSync(join(paths.output, 'discovery'), { recursive: true });

  const manual = new Set(config.manual_links);
  let inserted = 0;
  let fetchedBody = 0;
  let snippetOnly = 0;

  for (const url of config.manual_links) {
    const result = await savePost(
      store,
      { url, title: '', snippet: `手动保存链接 ${url}` },
      ingest,
      config.selected_locations[0] || '',
      null,
      null,
      saveDeps,
    );
    if (result.inserted) inserted += 1;
  }

  let hits: SearchHit[] = [];
  if (!deps.skipSearch && process.env.FISH_SCOUT_SKIP_SEARCH !== '1') {
    const searchFn =
      deps.searchFn ??
      ((cfg: ScoutConfig) =>
        searchPublicClues(cfg, { delayMs: 1000, baiduApiKey: loadBaiduSearchApiKey(root) }));
    hits = await searchFn(config);
    for (const hit of hits) {
      const result = await savePost(
        store,
        { url: hit.url, title: hit.title, snippet: hit.snippet },
        ingest,
        hit.location || config.selected_locations[0] || '',
        null,
        null,
        saveDeps,
      );
      if (result.inserted) inserted += 1;
      const bodyFetched = Boolean(result.post?.content);
      if (bodyFetched) fetchedBody += 1;
      else snippetOnly += 1;
    }
  }

  const discoveryPath = join(paths.output, 'discovery', `${date}.json`);
  writeFileSync(
    discoveryPath,
    JSON.stringify(
      {
        date,
        queries: buildSearchQueries(config),
        hits: hits.map((hit) => ({
          url: hit.url,
          title: hit.title,
          snippet: hit.snippet,
          query: hit.query,
          location: hit.location,
          body_fetched: Boolean(hit.url) && !isGatedUrl(hit.url, ingest),
        })),
      },
      null,
      2,
    ),
    'utf8',
  );

  const todayPosts = (await store.list())
    .filter((row) => shanghaiDate(new Date(row.crawl_time)) === date)
    .map((row) => toReportPost(row, manual));
  let markdown = buildDailyMarkdown(date, config.selected_locations, todayPosts);

  if (ingest.ai.enabled) {
    const extra = await summarizeReport(markdown, ingest.ai);
    if (extra) markdown = `${extra}\n\n${markdown}`;
  }

  const reportPath = join(paths.reports, `${date}.md`);
  writeFileSync(reportPath, markdown, 'utf8');
  return {
    reportPath,
    markdown,
    inserted,
    date,
    discovered: hits.length,
    fetched_body: fetchedBody,
    snippet_only: snippetOnly,
    discoveryPath,
  };
}

async function summarizeReport(
  markdown: string,
  ai: { base_url: string; api_key: string; model: string; max_input_chars?: number },
): Promise<string> {
  try {
    const res = await fetch(ai.base_url.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ai.api_key}`,
      },
      body: JSON.stringify({
        model: ai.model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '根据鱼情线索做不超过 8 行的中文摘要。只使用材料里的标题/摘要/链接，不要编造渔获、地点或数量。登录墙来源只能概括公开摘要。',
          },
          { role: 'user', content: markdown.slice(0, ai.max_input_chars || 3000) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content ? `## 综述\n\n${content}\n` : '';
  } catch {
    return '';
  }
}

export function readTodayReport(root = process.cwd()): { date: string; markdown: string; path: string } | null {
  const config = loadScoutConfig(root);
  const paths = scoutPaths(root, config);
  const date = shanghaiDate();
  const reportPath = join(paths.reports, `${date}.md`);
  if (!existsSync(reportPath)) return null;
  return { date, markdown: readFileSync(reportPath, 'utf8'), path: reportPath };
}
