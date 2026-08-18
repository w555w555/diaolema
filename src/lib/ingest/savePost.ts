import { join } from 'node:path';
import type { IngestConfig } from './config';
import { archivePost } from './archive';
import { localUrlFor } from './db';
import type { NewPostRow, PostRow, PostStore } from './types';
import { detectPlatform } from './detect';
import { extractInfo, mergeRuleAndAi } from './extract';
import { aiExtractFishingInfo } from './aiExtract';
import { fetchPageText } from './fetchPage';

export type SavePostItem = {
  url: string;
  title?: string;
  snippet?: string;
};

export type SavePostDeps = {
  fetchPageText?: typeof fetchPageText;
  aiExtractFishingInfo?: typeof aiExtractFishingInfo;
  nowIso?: () => string;
  archiveDir?: string;
};

function emptyPost(): NewPostRow {
  return {
    platform: '',
    platform_name: '',
    url: '',
    title: '',
    snippet: '',
    content: '',
    crawl_time: '',
    selected_location: '',
    city: '',
    location_text: '',
    fish_species: '',
    fishing_method: '',
    bait: '',
    catch_amount: '',
    confidence_score: 0,
    ai_summary: '',
    ai_location: '',
    ai_fish_species: '',
    ai_fishing_method: '',
    ai_bait: '',
    ai_catch_amount: '',
    ai_time_hint: '',
    ai_confidence_score: null,
    raw_text: '',
    author: '',
    lon: null,
    lat: null,
  };
}

export async function savePost(
  store: PostStore,
  item: SavePostItem,
  config: IngestConfig,
  selectedLocation = '',
  forcedPlatform: string | null = null,
  forcedPlatformName: string | null = null,
  deps: SavePostDeps = {},
): Promise<{ inserted: boolean; post?: PostRow }> {
  let url = item.url || '';
  const title = item.title ?? '';
  const snippet = item.snippet ?? '';

  const [detectedPlatform, detectedPlatformName] = detectPlatform(url, config);
  const platform = forcedPlatform || detectedPlatform;
  const platformName = forcedPlatformName || detectedPlatformName;

  const fetchFn = deps.fetchPageText ?? fetchPageText;
  const aiFn = deps.aiExtractFishingInfo ?? aiExtractFishingInfo;
  const pageText = await fetchFn(url, config);
  const rawText = `${title} ${snippet} ${pageText}`.trim();
  if (!url) url = localUrlFor(rawText || `${Date.now()}`);

  const existing = await store.findByUrl(url);
  if (existing) return { inserted: false, post: existing };

  const ruleInfo = extractInfo(rawText, config, { selectedLocation });
  const aiInfo = await aiFn(rawText, config);
  const merged = mergeRuleAndAi(ruleInfo, aiInfo);
  const crawlTime = (deps.nowIso ?? (() => new Date().toISOString()))();

  const row: NewPostRow = {
    ...emptyPost(),
    platform,
    platform_name: platformName,
    url,
    title,
    snippet,
    content: pageText.slice(0, 4000),
    crawl_time: crawlTime,
    selected_location: selectedLocation,
    city: merged.final_city,
    location_text: merged.final_location_text,
    fish_species: merged.final_fish_species,
    fishing_method: merged.final_fishing_method,
    bait: merged.final_bait,
    catch_amount: merged.final_catch_amount,
    confidence_score: merged.final_confidence,
    ai_summary: merged.ai_summary,
    ai_location: merged.ai_location,
    ai_fish_species: merged.ai_fish_species,
    ai_fishing_method: merged.ai_fishing_method,
    ai_bait: merged.ai_bait,
    ai_catch_amount: merged.ai_catch_amount,
    ai_time_hint: merged.ai_time_hint,
    ai_confidence_score: merged.ai_confidence_score,
    raw_text: rawText.slice(0, 4000),
  };

  const post = await store.insert(row);
  const archiveDir = deps.archiveDir ?? join(process.cwd(), 'fish_scout_data', 'posts');
  archivePost(archiveDir, post);
  return { inserted: true, post };
}
