import type {
  SearchOptions,
  SearchResult,
  PageContent,
  SearchProviderConfig,
} from '@deep-search/shared';
import { BaseSearchProvider } from './provider.js';
import { SimpleScraper } from './scraper.js';
import { parseHTML } from './parser.js';

interface SearXNGResult {
  url: string;
  title: string;
  content: string;
  engine: string;
  parsed_url: string[];
  engines: string[];
  positions: number[];
  publishedDate?: string;
  category?: string;
}

interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
  suggestions: string[];
  corrections: string[];
  infoboxes: unknown[];
}

export class SearXNGProvider extends BaseSearchProvider {
  private scraper: SimpleScraper;

  constructor(config: SearchProviderConfig) {
    super(config);
    this.scraper = new SimpleScraper(config);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.config.searxngUrl) {
      throw new Error('SearXNG URL not configured');
    }

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      categories: 'general',
    });

    if (options?.language) {
      params.set('language', options.language);
    }

    if (options?.safeSearch !== undefined) {
      params.set('safesearch', options.safeSearch ? '1' : '0');
    }

    if (options?.timeRange && options.timeRange !== 'all') {
      params.set('time_range', options.timeRange);
    }

    const url = `${this.config.searxngUrl}/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SearXNG search failed: ${response.status}`);
    }

    const data: SearXNGResponse = await response.json();

    const maxResults = options?.maxResults || 10;
    const results = data.results.slice(0, maxResults);

    return results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      source: result.engine,
      publishedDate: result.publishedDate,
    }));
  }

  async fetchPage(url: string): Promise<PageContent> {
    const scraped = await this.scraper.scrape(url);

    return {
      url: scraped.url,
      title: scraped.title,
      content: scraped.content,
      markdown: scraped.markdown,
      excerpt: scraped.metadata.description || scraped.content.slice(0, 200),
    };
  }
}
