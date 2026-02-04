// Search Provider Types

export interface SearchOptions {
  maxResults?: number;
  language?: string;
  safeSearch?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedDate?: string;
}

export interface PageContent {
  url: string;
  title: string;
  content: string;
  markdown: string;
  excerpt?: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  markdown: string;
  links: string[];
  metadata: {
    author?: string;
    publishedDate?: string;
    description?: string;
  };
}

export interface SearchProviderConfig {
  provider: 'searxng' | 'scraper';
  searxngUrl?: string;
  scraperTimeout?: number;
  scraperMaxConcurrent?: number;
  scraperUserAgent?: string;
}
