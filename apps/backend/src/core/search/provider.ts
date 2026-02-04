import type {
  SearchOptions,
  SearchResult,
  PageContent,
  ScrapedContent,
  SearchProviderConfig,
} from '@deep-search/shared';

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  fetchPage(url: string): Promise<PageContent>;
}

export interface WebScraper {
  scrape(url: string): Promise<ScrapedContent>;
  scrapeMultiple(urls: string[]): Promise<ScrapedContent[]>;
  close(): Promise<void>;
}

export abstract class BaseSearchProvider implements SearchProvider {
  protected config: SearchProviderConfig;

  constructor(config: SearchProviderConfig) {
    this.config = config;
  }

  abstract search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  abstract fetchPage(url: string): Promise<PageContent>;
}
