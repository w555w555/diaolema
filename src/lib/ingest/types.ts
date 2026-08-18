export type PostRow = {
  id: string;
  platform: string;
  platform_name: string;
  url: string;
  title: string;
  snippet: string;
  content: string;
  crawl_time: string;
  selected_location: string;
  city: string;
  location_text: string;
  fish_species: string;
  fishing_method: string;
  bait: string;
  catch_amount: string;
  confidence_score: number;
  ai_summary: string;
  ai_location: string;
  ai_fish_species: string;
  ai_fishing_method: string;
  ai_bait: string;
  ai_catch_amount: string;
  ai_time_hint: string;
  ai_confidence_score: number | null;
  raw_text: string;
  author: string;
  lon: number | null;
  lat: number | null;
};

export type NewPostRow = Omit<PostRow, 'id'>;

export type PostStore = {
  list(): Promise<PostRow[]>;
  findByUrl(url: string): Promise<PostRow | undefined>;
  insert(row: NewPostRow): Promise<PostRow>;
};
