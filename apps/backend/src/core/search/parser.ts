import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Configure turndown to ignore certain elements
turndown.remove(['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript']);

export interface ParsedContent {
  title: string;
  content: string;
  markdown: string;
  excerpt: string;
  links: string[];
  metadata: {
    author?: string;
    publishedDate?: string;
    description?: string;
  };
}

export function parseHTML(html: string, baseUrl: string): ParsedContent {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, iframe, noscript, .advertisement, .ad, .sidebar').remove();

  // Get title
  const title = $('title').text().trim() || $('h1').first().text().trim() || '';

  // Get metadata
  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').text().trim() ||
    undefined;

  const publishedDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="date"]').attr('content') ||
    $('time[datetime]').attr('datetime') ||
    undefined;

  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    undefined;

  // Get main content
  let mainContent = '';

  // Try to find the main content area
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.post',
    '.article',
  ];

  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      mainContent = element.html() || '';
      break;
    }
  }

  // Fall back to body content
  if (!mainContent) {
    mainContent = $('body').html() || '';
  }

  // Convert to plain text
  const $content = cheerio.load(mainContent);
  const textContent = $content.text()
    .replace(/\s+/g, ' ')
    .trim();

  // Convert to markdown
  const markdown = turndown.turndown(mainContent);

  // Extract excerpt
  const excerpt = textContent.slice(0, 300) + (textContent.length > 300 ? '...' : '');

  // Extract links
  const links: string[] = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        if (absoluteUrl.startsWith('http') && !links.includes(absoluteUrl)) {
          links.push(absoluteUrl);
        }
      } catch {
        // Ignore invalid URLs
      }
    }
  });

  return {
    title,
    content: textContent,
    markdown,
    excerpt,
    links: links.slice(0, 50), // Limit to 50 links
    metadata: {
      author,
      publishedDate,
      description,
    },
  };
}

export function extractSearchSnippet(html: string, maxLength = 200): string {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style').remove();

  const text = $.text()
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
}
