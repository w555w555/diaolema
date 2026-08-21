/**
 * 词表习性手册：从 src/data/fish-handbook.json 载入。
 * 编译自百科/公开垂钓文，运行时不联网。不是溶氧/水温实测。
 */
import type { WaterLayer } from '../types';
import raw from '../data/fish-handbook.json';
import { FISH_CATALOG, type CatalogFish } from './fishId/catalog';

export type FishHandbook = {
  habitLayer: string;
  layerFloor: WaterLayer | null;
  baitHint: string;
  lureKeywords: string[];
  baitKeywords: string[];
  forbidStance: string[];
  sources: string[];
};

type HandbookFile = {
  disclaimer: string;
  updatedAt: string;
  fish: Record<string, FishHandbook>;
};

const file = raw as HandbookFile;

export const HANDBOOK_DISCLAIMER = file.disclaimer;
export const HANDBOOK_UPDATED_AT = file.updatedAt;

export const LAYER_RANK: WaterLayer[] = ['底层', '中下层', '中上层', '上层'];

export function layerRank(layer: WaterLayer): number {
  return LAYER_RANK.indexOf(layer);
}

function loadHandbook(): Record<CatalogFish, FishHandbook> {
  const missing = FISH_CATALOG.filter((name) => !file.fish[name]);
  if (missing.length) {
    throw new Error(`fish-handbook.json 缺词条：${missing.join('、')}`);
  }
  return Object.fromEntries(FISH_CATALOG.map((name) => [name, file.fish[name]])) as Record<
    CatalogFish,
    FishHandbook
  >;
}

export const FISH_HANDBOOK = loadHandbook();

export function handbookOf(name: string): FishHandbook | null {
  const key = FISH_CATALOG.find((row) => row === name);
  return key ? FISH_HANDBOOK[key] : null;
}

/** 气象手册可以把层压低，但不能低过该鱼习性。翘嘴不到守底。 */
export function habitLayerFloor(name: string): WaterLayer | null {
  return handbookOf(name)?.layerFloor ?? null;
}

export function clampLayerToHabit(name: string, layer: WaterLayer): WaterLayer {
  const floor = habitLayerFloor(name);
  if (!floor) return layer;
  return layerRank(layer) < layerRank(floor) ? floor : layer;
}
