export type ScoutPlatform = {
  enabled: boolean;
  name: string;
  site: string;
};

export type ScoutConfig = {
  storage: {
    output_dir: string;
    db_name: string;
    report_dir: string;
    post_archive_dir: string;
  };
  selected_locations: string[];
  locations: string[];
  platforms: Record<string, ScoutPlatform>;
  base_keywords: string[];
  fish_species: string[];
  methods: string[];
  baits: string[];
  ai: {
    enabled: boolean;
    base_url: string;
    model: string;
    api_key_env: string;
    max_input_chars: number;
  };
  manual_links: string[];
};

export type SearchHit = {
  url: string;
  title: string;
  snippet: string;
  query?: string;
  location?: string;
};

export type ReportPost = {
  platform_name: string;
  city: string;
  location_text: string;
  fish_species: string;
  fishing_method: string;
  bait: string;
  title: string;
  snippet: string;
  url: string;
  source_kind: 'manual' | 'public';
};
