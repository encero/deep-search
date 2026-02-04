import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';
import type { ScrapedContent, SearchProviderConfig } from '@deep-search/shared';
import type { WebScraper } from './provider.js';
import { parseHTML } from './parser.js';

export class PlaywrightScraper implements WebScraper {
  private browser: Browser | null = null;
  private config: SearchProviderConfig;
  private activeScrapes = 0;

  constructor(config: SearchProviderConfig) {
    this.config = config;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  private async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: this.config.scraperUserAgent || 'DeepSearch/1.0',
      viewport: { width: 1280, height: 720 },
    });
    return context.newPage();
  }

  async scrape(url: string): Promise<ScrapedContent> {
    const page = await this.createPage();

    try {
      await page.goto(url, {
        timeout: this.config.scraperTimeout || 30000,
        waitUntil: 'domcontentloaded',
      });

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Get the page HTML
      const html = await page.content();

      // Parse the HTML
      const parsed = parseHTML(html, url);

      return {
        url,
        title: parsed.title,
        content: parsed.content,
        markdown: parsed.markdown,
        links: parsed.links,
        metadata: parsed.metadata,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to scrape ${url}: ${errorMessage}`);
    } finally {
      await page.close();
    }
  }

  async scrapeMultiple(urls: string[]): Promise<ScrapedContent[]> {
    const maxConcurrent = this.config.scraperMaxConcurrent || 5;
    const results: ScrapedContent[] = [];
    const errors: string[] = [];

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (url) => {
        try {
          return await this.scrape(url);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${url}: ${errorMessage}`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is ScrapedContent => r !== null));
    }

    if (errors.length > 0) {
      console.warn('Scraping errors:', errors);
    }

    return results;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Simple fetch-based scraper for static pages
export class SimpleScraper implements WebScraper {
  private config: SearchProviderConfig;

  constructor(config: SearchProviderConfig) {
    this.config = config;
  }

  async scrape(url: string): Promise<ScrapedContent> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.scraperTimeout || 30000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.scraperUserAgent || 'DeepSearch/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parsed = parseHTML(html, url);

      return {
        url,
        title: parsed.title,
        content: parsed.content,
        markdown: parsed.markdown,
        links: parsed.links,
        metadata: parsed.metadata,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async scrapeMultiple(urls: string[]): Promise<ScrapedContent[]> {
    const maxConcurrent = this.config.scraperMaxConcurrent || 5;
    const results: ScrapedContent[] = [];

    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (url) => {
        try {
          return await this.scrape(url);
        } catch (error) {
          console.warn(`Failed to scrape ${url}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is ScrapedContent => r !== null));
    }

    return results;
  }

  async close(): Promise<void> {
    // Nothing to close for simple scraper
  }
}
