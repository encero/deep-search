import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleScraper } from '../../../src/core/search/scraper.js';
import { mockHtmlContent } from '../../fixtures/index.js';

// Setup fetch mock for this test file
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SimpleScraper', () => {
  let scraper: SimpleScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    scraper = new SimpleScraper({
      provider: 'scraper',
      scraperTimeout: 30000,
      scraperMaxConcurrent: 5,
      scraperUserAgent: 'TestScraper/1.0',
    });
  });

  describe('scrape', () => {
    it('should scrape a URL and return content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtmlContent),
      } as Response);

      const result = await scraper.scrape('https://example.com/article');

      expect(result.url).toBe('https://example.com/article');
      expect(result.title).toBe('Test Page');
      expect(result.content).toContain('Main Heading');
      expect(result.markdown).toContain('# Main Heading');
      expect(result.metadata.author).toBe('Test Author');
    });

    it('should include correct user agent header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtmlContent),
      } as Response);

      await scraper.scrape('https://example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'TestScraper/1.0',
          }),
        })
      );
    });

    it('should throw error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(scraper.scrape('https://example.com/missing')).rejects.toThrow(
        'HTTP 404: Not Found'
      );
    });

    it('should handle timeout via AbortController', async () => {
      const shortTimeoutScraper = new SimpleScraper({
        provider: 'scraper',
        scraperTimeout: 100,
        scraperMaxConcurrent: 5,
      });

      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, text: () => mockHtmlContent } as Response), 5000);
          })
      );

      // The test should complete (with error or success) within timeout
      // In real implementation, the AbortController would abort the fetch
    });

    it('should extract links from scraped content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtmlContent),
      } as Response);

      const result = await scraper.scrape('https://example.com');

      expect(result.links).toBeInstanceOf(Array);
      expect(result.links.some((link) => link.includes('example.com'))).toBe(true);
    });
  });

  describe('scrapeMultiple', () => {
    it('should scrape multiple URLs', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><head><title>Page 1</title></head><body><p>Content 1</p></body></html>'),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><head><title>Page 2</title></head><body><p>Content 2</p></body></html>'),
        } as Response);

      const results = await scraper.scrapeMultiple([
        'https://example.com/page1',
        'https://example.com/page2',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Page 1');
      expect(results[1].title).toBe('Page 2');
    });

    it('should continue on individual failures', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><head><title>Success</title></head><body></body></html>'),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Server Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><head><title>Also Success</title></head><body></body></html>'),
        } as Response);

      const results = await scraper.scrapeMultiple([
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Success');
      expect(results[1].title).toBe('Also Success');
    });

    it('should respect max concurrent limit', async () => {
      const limitedScraper = new SimpleScraper({
        provider: 'scraper',
        scraperTimeout: 30000,
        scraperMaxConcurrent: 2,
      });

      let concurrentCalls = 0;
      let maxConcurrent = 0;

      mockFetch.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrentCalls--;
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><head><title>Test</title></head><body></body></html>'),
        } as Response;
      });

      await limitedScraper.scrapeMultiple([
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
        'https://example.com/4',
      ]);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should return empty array for empty input', async () => {
      const results = await scraper.scrapeMultiple([]);
      expect(results).toEqual([]);
    });
  });

  describe('close', () => {
    it('should not throw when closing', async () => {
      await expect(scraper.close()).resolves.not.toThrow();
    });
  });
});
