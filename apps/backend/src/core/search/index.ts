import type { SearchProviderConfig } from '@deep-search/shared';
import { config } from '../../config/index.js';
import type { SearchProvider, WebScraper } from './provider.js';
import { SearXNGProvider } from './searxng.js';
import { ScraperSearchProvider } from './scraper-search.js';
import { PlaywrightScraper, SimpleScraper } from './scraper.js';

export { type SearchProvider, type WebScraper } from './provider.js';
export { SearXNGProvider } from './searxng.js';
export { ScraperSearchProvider } from './scraper-search.js';
export { PlaywrightScraper, SimpleScraper } from './scraper.js';
export { parseHTML, extractSearchSnippet } from './parser.js';

let searchProviderInstance: SearchProvider | null = null;
let scraperInstance: WebScraper | null = null;

export function createSearchProvider(providerConfig?: SearchProviderConfig): SearchProvider {
  const searchConfig: SearchProviderConfig = providerConfig || {
    provider: config.search.provider,
    searxngUrl: config.search.searxngUrl,
    scraperTimeout: config.search.scraperTimeout,
    scraperMaxConcurrent: config.search.scraperMaxConcurrent,
    scraperUserAgent: config.search.scraperUserAgent,
  };

  switch (searchConfig.provider) {
    case 'searxng':
      return new SearXNGProvider(searchConfig);
    case 'scraper':
    default:
      return new ScraperSearchProvider(searchConfig);
  }
}

export function getSearchProvider(): SearchProvider {
  if (!searchProviderInstance) {
    searchProviderInstance = createSearchProvider();
  }
  return searchProviderInstance;
}

export function createScraper(providerConfig?: SearchProviderConfig, usePlaywright = false): WebScraper {
  const searchConfig: SearchProviderConfig = providerConfig || {
    provider: config.search.provider,
    scraperTimeout: config.search.scraperTimeout,
    scraperMaxConcurrent: config.search.scraperMaxConcurrent,
    scraperUserAgent: config.search.scraperUserAgent,
  };

  if (usePlaywright) {
    return new PlaywrightScraper(searchConfig);
  }
  return new SimpleScraper(searchConfig);
}

export function getScraper(usePlaywright = false): WebScraper {
  if (!scraperInstance) {
    scraperInstance = createScraper(undefined, usePlaywright);
  }
  return scraperInstance;
}

export function resetSearchProvider(): void {
  searchProviderInstance = null;
}

export async function resetScraper(): Promise<void> {
  if (scraperInstance) {
    await scraperInstance.close();
    scraperInstance = null;
  }
}
