import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearXNGProvider } from '../../../src/core/search/searxng.js';
import { mockSearchResults, mockHtmlContent } from '../../fixtures/index.js';

// Setup fetch mock for this test file
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SearXNGProvider', () => {
  let provider: SearXNGProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    provider = new SearXNGProvider({
      provider: 'searxng',
      searxngUrl: 'http://localhost:8080',
      scraperTimeout: 30000,
      scraperMaxConcurrent: 5,
      scraperUserAgent: 'DeepSearch/1.0',
    });
  });

  describe('search', () => {
    it('should perform a search and return results', async () => {
      const searxngResponse = {
        query: 'test query',
        number_of_results: 3,
        results: mockSearchResults.map((r) => ({
          url: r.url,
          title: r.title,
          content: r.snippet,
          engine: 'google',
          engines: ['google'],
          positions: [1],
        })),
        suggestions: [],
        corrections: [],
        infoboxes: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(searxngResponse),
      } as Response);

      const results = await provider.search('test query');

      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Introduction to Machine Learning');
      expect(results[0].url).toBe('https://example.com/ml-intro');
      expect(results[0].snippet).toBe('Machine learning is a subset of artificial intelligence...');
    });

    it('should include correct query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      } as Response);

      await provider.search('test query', {
        language: 'en',
        safeSearch: true,
        timeRange: 'week',
      });

      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.searchParams.get('q')).toBe('test query');
      expect(url.searchParams.get('format')).toBe('json');
      expect(url.searchParams.get('language')).toBe('en');
      expect(url.searchParams.get('safesearch')).toBe('1');
      expect(url.searchParams.get('time_range')).toBe('week');
    });

    it('should respect maxResults option', async () => {
      const manyResults = {
        results: Array.from({ length: 20 }, (_, i) => ({
          url: `https://example.com/${i}`,
          title: `Result ${i}`,
          content: `Content ${i}`,
          engine: 'google',
          engines: ['google'],
          positions: [i],
        })),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(manyResults),
      } as Response);

      const results = await provider.search('test', { maxResults: 5 });

      expect(results).toHaveLength(5);
    });

    it('should throw error when SearXNG URL is not configured', async () => {
      const providerNoUrl = new SearXNGProvider({
        provider: 'searxng',
        scraperTimeout: 30000,
      });

      await expect(providerNoUrl.search('test')).rejects.toThrow('SearXNG URL not configured');
    });

    it('should throw error on SearXNG API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);

      await expect(provider.search('test')).rejects.toThrow('SearXNG search failed: 503');
    });

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      } as Response);

      const results = await provider.search('obscure query');

      expect(results).toEqual([]);
    });

    it('should include published date when available', async () => {
      const resultsWithDate = {
        results: [
          {
            url: 'https://example.com/article',
            title: 'Article',
            content: 'Content',
            engine: 'google',
            publishedDate: '2024-01-15T10:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(resultsWithDate),
      } as Response);

      const results = await provider.search('test');

      expect(results[0].publishedDate).toBe('2024-01-15T10:00:00Z');
    });
  });

  describe('fetchPage', () => {
    it('should fetch and parse page content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtmlContent),
      } as Response);

      const content = await provider.fetchPage('https://example.com/article');

      expect(content.url).toBe('https://example.com/article');
      expect(content.title).toBe('Test Page');
      expect(content.content).toContain('Main Heading');
      expect(content.markdown).toContain('# Main Heading');
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(provider.fetchPage('https://example.com/missing')).rejects.toThrow();
    });
  });
});
