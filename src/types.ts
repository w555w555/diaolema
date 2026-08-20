export type WaterLayer = '上层' | '中上层' | '中下层' | '底层';

export type CatchSource = 'user' | 'xiaohongshu' | 'douyin' | 'weibo' | 'wechat' | 'bilibili' | 'tieba' | 'zhihu' | 'news' | 'public' | 'seed';

export type WeatherSnapshot = {
  at: string;
  lat: number;
  lon: number;
  temperatureC: number;
  apparentC: number;
  humidityPct: number;
  pressureHpa: number;
  pressureDelta3h: number;
  windKmh: number;
  windDirDeg: number;
  precipitationMm: number;
  weatherCode: number;
  cloudPct: number;
};

export type FishingAdvice = {
  layer: WaterLayer;
  baits: string[];
  method: string;
  tip: string;
  reasons: string[];
  targetFish: string[];
  flavor: string;
  form: string;
  baitLabel: string;
  spot: string;
  lure: string;
  lureNote: string;
  window: string;
};

export type FishStyle = '台钓' | '路亚';

export type CatchReport = {
  id: string;
  author: string;
  fish: string;
  spotName: string;
  lon: number;
  lat: number;
  caughtAt: string;
  source: CatchSource;
  note?: string;
  title?: string;
  sourceUrl?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
};

export type VenueStatus = 'open' | 'paused' | 'closed' | 'unknown';

export type FishingVenue = {
  id: string;
  shopId: string;
  name: string;
  district: string;
  addressHint: string;
  kind: string;
  avgPriceYuan: number | null;
  feeLabel: string;
  status: VenueStatus;
  statusLabel: string;
  rating?: number;
  catalogSource?: 'dianping' | 'diaoyu' | 'kklure' | 'web';
  imageUrl?: string;
  lon: number;
  lat: number;
  url: string;
};

export type SpotReview = {
  id: string;
  venueId: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  imageUrl?: string;
  createdAt: string;
  source: 'seed' | 'user';
};

export type SeedSpotReview = Omit<SpotReview, 'createdAt'> & { hoursAgo: number };

export type SeedCatch = Omit<CatchReport, 'caughtAt'> & { hoursAgo: number };

export type FishIdResult = {
  species: string;
  confidence: number;
  alternatives: { species: string; confidence: number }[];
  cues: string[];
  inCatalog: boolean;
};

export type FishingIndexLabel = '很高' | '较高' | '一般' | '偏低' | '不宜';

export type FishingIndex = {
  score: number;
  label: FishingIndexLabel;
  reasons: string[];
};

export const SHANGHAI_CENTER = { lon: 121.473701, lat: 31.230416 };

export type HubProduct = {
  id: string;
  name: string;
  kind: string;
  priceYuan: number;
  tag: string;
  blurb: string;
};

export type HubEvent = {
  id: string;
  title: string;
  when: string;
  place: string;
  kind: string;
  blurb: string;
};

export type HubTip = {
  id: string;
  title: string;
  method: '台钓' | '路亚' | '兼钓';
  summary: string;
  body: string;
};

export type GearReview = {
  id: string;
  gearName: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
  source: 'seed' | 'user';
};

export type SeedGearReview = Omit<GearReview, 'createdAt'> & { hoursAgo: number };

export type HubRoom = {
  id: string;
  name: string;
  topic: string;
  members: number;
};

export type ChatQuote = {
  id: string;
  author: string;
  preview: string;
};

export type HubChatMessage = {
  id: string;
  roomId: string;
  author: string;
  body: string;
  createdAt: string;
  source: 'seed' | 'user';
  userId?: string;
  kind?: 'text' | 'voice' | 'sticker' | 'share' | 'image' | 'video';
  durationMs?: number;
  mediaUrl?: string;
  replyTo?: ChatQuote;
};

export type SeedHubChatMessage = Omit<HubChatMessage, 'createdAt'> & { hoursAgo: number };

export type HubView = 'home' | 'mall' | 'events' | 'tips' | 'reviews' | 'community' | 'chat';

