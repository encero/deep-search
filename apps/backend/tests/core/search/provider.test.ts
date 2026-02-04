import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSearchProvider,
  getSearchProvider,
  resetSearchProvider,
  createScraper,
  getScraper,
  resetScraper,
  SearXNGProvider,
  ScraperSearchProvider,
  SimpleScraper,
} from '../../../src/core/search/index.js';

// Mock the config module
vi.mock('../../../src/config/index.js', () => ({
  config: {
    search: {
      provider: 'scraper',
      searxngUrl: 'http://localhost:8080',
      scraperTimeout: 30000,
      scraperMaxConcurrent: 5,
      scraperUserAgent: 'DeepSearch/1.0',
    },
  },
}));

describe('Search Provider Factory', () => {
  beforeEach(() => {
    resetSearchProvider();
  });

  afterEach(async () => {
    resetSearchProvider();
    await resetScraper();
  });

  describe('createSearchProvider', () => {
    it('should create ScraperSearchProvider for scraper provider', () => {
      const provider = createSearchProvider({
        provider: 'scraper',
        scraperTimeout: 30000,
      });

      expect(provider).toBeInstanceOf(ScraperSearchProvider);
    });

    it('should create SearXNGProvider for searxng provider', () => {
      const provider = createSearchProvider({
        provider: 'searxng',
        searxngUrl: 'http://localhost:8080',
      });

      expect(provider).toBeInstanceOf(SearXNGProvider);
    });

    it('should default to ScraperSearchProvider for unknown provider', () => {
      const provider = createSearchProvider({
        provider: 'unknown' as any,
      });

      expect(provider).toBeInstanceOf(ScraperSearchProvider);
    });

    it('should use config values when no config is provided', () => {
      const provider = createSearchProvider();
      expect(provider).toBeInstanceOf(ScraperSearchProvider);
    });
  });

  describe('getSearchProvider', () => {
    it('should return singleton instance', () => {
      const provider1 = getSearchProvider();
      const provider2 = getSearchProvider();

      expect(provider1).toBe(provider2);
    });

    it('should create new instance after reset', () => {
      const provider1 = getSearchProvider();
      resetSearchProvider();
      const provider2 = getSearchProvider();

      expect(provider1).not.toBe(provider2);
    });
  });

  describe('createScraper', () => {
    it('should create SimpleScraper by default', () => {
      const scraper = createScraper();
      expect(scraper).toBeInstanceOf(SimpleScraper);
    });

    it('should use config values when no config is provided', () => {
      const scraper = createScraper();
      expect(scraper).toBeDefined();
    });
  });

  describe('getScraper', () => {
    it('should return singleton instance', () => {
      const scraper1 = getScraper();
      const scraper2 = getScraper();

      expect(scraper1).toBe(scraper2);
    });

    it('should create new instance after reset', async () => {
      const scraper1 = getScraper();
      await resetScraper();
      const scraper2 = getScraper();

      expect(scraper1).not.toBe(scraper2);
    });
  });

  describe('resetScraper', () => {
    it('should close and reset the scraper instance', async () => {
      const scraper = getScraper();
      const closeSpy = vi.spyOn(scraper, 'close');

      await resetScraper();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not throw when called with no instance', async () => {
      await expect(resetScraper()).resolves.not.toThrow();
    });
  });
});
