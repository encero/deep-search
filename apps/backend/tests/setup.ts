import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file::memory:';
process.env.LLM_PROVIDER = 'openai-compat';
process.env.LLM_BASE_URL = 'http://localhost:11434/v1';
process.env.LLM_MODEL = 'test-model';
process.env.SEARCH_PROVIDER = 'scraper';

// Mock fetch globally for tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Global test utilities
beforeAll(() => {
  // Global setup before all tests
});

afterAll(() => {
  // Global cleanup after all tests
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Helper to create mock fetch responses
export function mockFetchResponse(data: unknown, status = 200) {
  return vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    body: null,
  } as Response);
}

// Helper to create mock streaming response
export function mockStreamingResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let chunkIndex = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (chunkIndex < chunks.length) {
        controller.enqueue(encoder.encode(chunks[chunkIndex]));
        chunkIndex++;
      } else {
        controller.close();
      }
    },
  });

  return vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: true,
    status: 200,
    body: stream,
    headers: new Headers(),
  } as Response);
}
