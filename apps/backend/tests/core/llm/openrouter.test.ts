import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterProvider } from '../../../src/core/llm/openrouter.js';
import { mockChatRequest, mockOpenAIChatResponse, mockStreamChunks } from '../../fixtures/index.js';

// Setup fetch mock for this test file
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    provider = new OpenRouterProvider({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'test-openrouter-key',
      model: 'anthropic/claude-3-haiku',
      defaultTemperature: 0.7,
      defaultMaxTokens: 4096,
    });
  });

  describe('chat', () => {
    it('should make a successful chat request to OpenRouter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      const response = await provider.chat(mockChatRequest);

      expect(response.content).toBe('I am doing well, thank you for asking!');
      expect(response.model).toBe('test-model');
    });

    it('should include OpenRouter-specific headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat(mockChatRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-openrouter-key',
            'HTTP-Referer': 'https://deep-search.local',
            'X-Title': 'Deep Search',
          }),
        })
      );
    });

    it('should use the OpenRouter base URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat(mockChatRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(provider.chat(mockChatRequest)).rejects.toThrow(
        'OpenRouter API error: 401 - Unauthorized'
      );
    });

    it('should handle rate limiting errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      } as Response);

      await expect(provider.chat(mockChatRequest)).rejects.toThrow(
        'OpenRouter API error: 429 - Rate limit exceeded'
      );
    });
  });

  describe('streamChat', () => {
    it('should stream chat responses from OpenRouter', async () => {
      const encoder = new TextEncoder();
      const streamData = 'data: {"id":"1","choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n\n';

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamData));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      } as Response);

      // Verify streaming request is made correctly
      for await (const chunk of provider.streamChat(mockChatRequest)) {
        if (chunk.done) break;
      }

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.stream).toBe(true);
    });

    it('should include streaming headers', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      } as Response);

      const generator = provider.streamChat(mockChatRequest);
      // Consume the generator
      for await (const _ of generator) {
        // Just consume
      }

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.stream).toBe(true);
    });
  });

  describe('model selection', () => {
    it('should use default model when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat({ messages: mockChatRequest.messages });

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.model).toBe('anthropic/claude-3-haiku');
    });

    it('should use request model when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat({
        ...mockChatRequest,
        model: 'openai/gpt-4',
      });

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.model).toBe('openai/gpt-4');
    });
  });
});
