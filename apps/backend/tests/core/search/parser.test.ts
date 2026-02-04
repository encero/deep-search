import { describe, it, expect } from 'vitest';
import { parseHTML, extractSearchSnippet } from '../../../src/core/search/parser.js';
import { mockHtmlContent } from '../../fixtures/index.js';

describe('HTML Parser', () => {
  describe('parseHTML', () => {
    it('should extract title from HTML', () => {
      const result = parseHTML(mockHtmlContent, 'https://example.com');
      expect(result.title).toBe('Test Page');
    });

    it('should extract content from article element', () => {
      const result = parseHTML(mockHtmlContent, 'https://example.com');
      expect(result.content).toContain('Main Heading');
      expect(result.content).toContain('first paragraph');
      expect(result.content).toContain('second paragraph');
    });

    it('should convert content to markdown', () => {
      const result = parseHTML(mockHtmlContent, 'https://example.com');
      expect(result.markdown).toContain('# Main Heading');
    });

    it('should extract metadata', () => {
      const result = parseHTML(mockHtmlContent, 'https://example.com');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.metadata.description).toBe('Test description');
    });

    it('should extract links', () => {
      const result = parseHTML(mockHtmlContent, 'https://example.com');
      expect(result.links).toContain('https://example.com/link1');
      expect(result.links).toContain('https://external.com/link2');
    });

    it('should create excerpt from content', () => {
      const result = parseHTML(mockHtmlContent, 'https://example.com');
      expect(result.excerpt).toBeTruthy();
      expect(result.excerpt.length).toBeLessThanOrEqual(303); // 300 + '...'
    });

    it('should handle HTML without article element', () => {
      const simpleHtml = `
        <html>
          <head><title>Simple Page</title></head>
          <body>
            <p>Some content here.</p>
          </body>
        </html>
      `;
      const result = parseHTML(simpleHtml, 'https://example.com');
      expect(result.title).toBe('Simple Page');
      expect(result.content).toContain('Some content');
    });

    it('should handle missing title gracefully', () => {
      const noTitleHtml = `
        <html>
          <body>
            <h1>Heading as Title</h1>
            <p>Content</p>
          </body>
        </html>
      `;
      const result = parseHTML(noTitleHtml, 'https://example.com');
      expect(result.title).toBe('Heading as Title');
    });

    it('should remove script and style elements', () => {
      const htmlWithScript = `
        <html>
          <body>
            <script>alert('evil');</script>
            <style>.hidden { display: none; }</style>
            <p>Real content</p>
          </body>
        </html>
      `;
      const result = parseHTML(htmlWithScript, 'https://example.com');
      expect(result.content).not.toContain('alert');
      expect(result.content).not.toContain('.hidden');
      expect(result.content).toContain('Real content');
    });

    it('should convert relative URLs to absolute', () => {
      const htmlWithRelativeLinks = `
        <html>
          <body>
            <a href="/page1">Page 1</a>
            <a href="page2">Page 2</a>
            <a href="https://other.com/page3">Page 3</a>
          </body>
        </html>
      `;
      const result = parseHTML(htmlWithRelativeLinks, 'https://example.com/dir/');
      expect(result.links).toContain('https://example.com/page1');
      expect(result.links).toContain('https://example.com/dir/page2');
      expect(result.links).toContain('https://other.com/page3');
    });

    it('should limit number of extracted links', () => {
      let manyLinksHtml = '<html><body>';
      for (let i = 0; i < 100; i++) {
        manyLinksHtml += `<a href="/page${i}">Link ${i}</a>`;
      }
      manyLinksHtml += '</body></html>';

      const result = parseHTML(manyLinksHtml, 'https://example.com');
      expect(result.links.length).toBeLessThanOrEqual(50);
    });
  });

  describe('extractSearchSnippet', () => {
    it('should extract text snippet from HTML', () => {
      const snippet = extractSearchSnippet(mockHtmlContent);
      expect(snippet).toContain('Main Heading');
      expect(snippet).not.toContain('<');
      expect(snippet).not.toContain('>');
    });

    it('should truncate long content', () => {
      const longHtml = `<html><body><p>${'x'.repeat(500)}</p></body></html>`;
      const snippet = extractSearchSnippet(longHtml, 200);
      expect(snippet.length).toBeLessThanOrEqual(203); // 200 + '...'
    });

    it('should not add ellipsis for short content', () => {
      const shortHtml = '<html><body><p>Short</p></body></html>';
      const snippet = extractSearchSnippet(shortHtml);
      expect(snippet).toBe('Short');
      expect(snippet).not.toContain('...');
    });

    it('should remove script content', () => {
      const htmlWithScript = '<html><body><script>malicious()</script><p>Safe</p></body></html>';
      const snippet = extractSearchSnippet(htmlWithScript);
      expect(snippet).not.toContain('malicious');
      expect(snippet).toContain('Safe');
    });
  });
});
