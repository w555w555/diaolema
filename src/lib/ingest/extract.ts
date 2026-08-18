import type { IngestConfig } from './config';

export type RuleInfo = {
  city: string;
  location_text: string;
  fish_species: string;
  fishing_method: string;
  bait: string;
  catch_amount: string;
  confidence_score: number;
};

export type AiInfo = {
  summary?: string;
  location?: string;
  fish_species?: string;
  fishing_method?: string;
  bait?: string;
  catch_amount?: string;
  time_hint?: string;
  confidence_score?: number | null;
};

export type MergedInfo = {
  final_city: string;
  final_location_text: string;
  final_fish_species: string;
  final_fishing_method: string;
  final_bait: string;
  final_catch_amount: string;
  final_confidence: number;
  ai_summary: string;
  ai_location: string;
  ai_fish_species: string;
  ai_fishing_method: string;
  ai_bait: string;
  ai_catch_amount: string;
  ai_time_hint: string;
  ai_confidence_score: number | null;
};

function firstHit(text: string, words: string[]): string {
  return words.find((w) => text.includes(w)) ?? '';
}

function firstSpot(text: string, spots: IngestConfig['spots']): string {
  const hit = spots.find((spot) => {
    if (text.includes(spot.name)) return true;
    return spot.aliases?.some((a) => text.includes(a)) ?? false;
  });
  return hit?.name ?? '';
}

export function extractInfo(
  rawText: string,
  config: IngestConfig,
  options: { selectedLocation?: string } = {},
): RuleInfo {
  const text = rawText || '';
  const selected = options.selectedLocation?.trim() ?? '';
  const location_text = firstSpot(text, config.spots);
  const city = selected || firstHit(text, config.cities) || (location_text ? '上海' : '');
  const fish_species = firstHit(text, config.fish_species);
  const fishing_method = firstHit(text, config.fishing_methods);
  const bait = firstHit(text, config.baits);
  const amount = text.match(/(\d+\s*(?:条|尾|斤|公斤|kg))/i)?.[1]?.replace(/\s+/g, '') ?? '';

  const filled = [city, location_text, fish_species, fishing_method, bait, amount].filter(Boolean).length;
  const confidence_score = Math.min(1, Number((filled * 0.18).toFixed(2)));

  return {
    city,
    location_text,
    fish_species,
    fishing_method,
    bait,
    catch_amount: amount,
    confidence_score,
  };
}

export function mergeRuleAndAi(rule: RuleInfo, aiInfo?: AiInfo | null): MergedInfo {
  let final_city = rule.city;
  let final_location_text = rule.location_text;
  let final_fish_species = rule.fish_species;
  let final_fishing_method = rule.fishing_method;
  let final_bait = rule.bait;
  let final_catch_amount = rule.catch_amount;
  let final_confidence = rule.confidence_score;

  const ai_summary = aiInfo?.summary ?? '';
  const ai_location = aiInfo?.location ?? '';
  const ai_fish_species = aiInfo?.fish_species ?? '';
  const ai_fishing_method = aiInfo?.fishing_method ?? '';
  const ai_bait = aiInfo?.bait ?? '';
  const ai_catch_amount = aiInfo?.catch_amount ?? '';
  const ai_time_hint = aiInfo?.time_hint ?? '';
  const ai_confidence_score =
    aiInfo?.confidence_score === undefined || aiInfo?.confidence_score === null
      ? null
      : Number(aiInfo.confidence_score);

  if (aiInfo) {
    if (ai_location && !final_location_text) {
      final_location_text = ai_location;
      final_city = ai_location;
    }
    if (ai_fish_species && !final_fish_species) final_fish_species = ai_fish_species;
    if (ai_fishing_method && !final_fishing_method) final_fishing_method = ai_fishing_method;
    if (ai_bait && !final_bait) final_bait = ai_bait;
    if (ai_catch_amount && !final_catch_amount) final_catch_amount = ai_catch_amount;
    if (ai_confidence_score != null) {
      final_confidence = Math.round(Math.min(Math.max(final_confidence, ai_confidence_score), 1) * 100) / 100;
    }
  }

  return {
    final_city,
    final_location_text,
    final_fish_species,
    final_fishing_method,
    final_bait,
    final_catch_amount,
    final_confidence,
    ai_summary,
    ai_location,
    ai_fish_species,
    ai_fishing_method,
    ai_bait,
    ai_catch_amount,
    ai_time_hint,
    ai_confidence_score,
  };
}
