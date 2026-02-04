import type {
  SearchOptions,
  SearchResult,
  PageContent,
  SearchProviderConfig,
} from '@deep-search/shared';
import * as cheerio from 'cheerio';
import { BaseSearchProvider } from './provider.js';
import { SimpleScraper } from './scraper.js';

export class ScraperSearchProvider extends BaseSearchProvider {
  private scraper: SimpleScraper;

  constructor(config: SearchProviderConfig) {
    super(config);
    this.scraper = new SimpleScraper(config);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Use DuckDuckGo HTML search as a fallback
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.scraperTimeout || 30000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.scraperUserAgent || 'DeepSearch/1.0',
          Accept: 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const results: SearchResult[] = [];
      const maxResults = options?.maxResults || 10;

      // Parse DuckDuckGo HTML results
      $('.result').each((index, element) => {
        if (results.length >= maxResults) return false;

        const $result = $(element);
        const $title = $result.find('.result__title a');
        const $snippet = $result.find('.result__snippet');

        const title = $title.text().trim();
        const href = $title.attr('href');
        const snippet = $snippet.text().trim();

        if (title && href) {
          // DuckDuckGo uses redirect URLs, extract the actual URL
          let actualUrl = href;
          try {
            const urlObj = new URL(href, 'https://duckduckgo.com');
            const uddg = urlObj.searchParams.get('uddg');
            if (uddg) {
              actualUrl = decodeURIComponent(uddg);
            }
          } catch {
            // Use href as-is if parsing fails
          }

          results.push({
            title,
            url: actualUrl,
            snippet: snippet || '',
          });
        }
      });

      return results;
    } finally {
      clearTimeout(timeout);
    }
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
