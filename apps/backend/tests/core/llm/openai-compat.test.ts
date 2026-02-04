import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAICompatProvider } from '../../../src/core/llm/openai-compat.js';
import {
  mockChatRequest,
  mockOpenAIChatResponse,
  mockStreamChunks,
} from '../../fixtures/index.js';

// Setup fetch mock for this test file
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('OpenAICompatProvider', () => {
  let provider: OpenAICompatProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    provider = new OpenAICompatProvider({
      provider: 'openai-compat',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'llama3.2',
      defaultTemperature: 0.7,
      defaultMaxTokens: 4096,
    });
  });

  describe('chat', () => {
    it('should make a successful chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      const response = await provider.chat(mockChatRequest);

      expect(response.content).toBe('I am doing well, thank you for asking!');
      expect(response.model).toBe('test-model');
      expect(response.usage).toEqual({
        promptTokens: 20,
        completionTokens: 10,
        totalTokens: 30,
      });
      expect(response.finishReason).toBe('stop');
    });

    it('should include authorization header when API key is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat(mockChatRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should use default model when not specified in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat({ messages: mockChatRequest.messages });

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.model).toBe('llama3.2');
    });

    it('should use request model when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat({ ...mockChatRequest, model: 'custom-model' });

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.model).toBe('custom-model');
    });

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      await expect(provider.chat(mockChatRequest)).rejects.toThrow(
        'LLM API error: 500 - Internal Server Error'
      );
    });

    it('should handle stop sequences', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat({
        ...mockChatRequest,
        stopSequences: ['STOP', 'END'],
      });

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.stop).toEqual(['STOP', 'END']);
    });
  });

  describe('streamChat', () => {
    it('should make streaming request with stream=true', async () => {
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

      // Just consume the generator to trigger the fetch
      for await (const chunk of provider.streamChat(mockChatRequest)) {
        if (chunk.done) break;
      }

      // Verify streaming was requested
      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.stream).toBe(true);
    });

    it('should throw error when response has no body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: null,
      } as Response);

      const generator = provider.streamChat(mockChatRequest);
      await expect(generator.next()).rejects.toThrow('No response body');
    });

    it('should throw error on failed streaming request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      } as Response);

      const generator = provider.streamChat(mockChatRequest);
      await expect(generator.next()).rejects.toThrow('LLM API error: 500');
    });
  });

  describe('configuration', () => {
    it('should work without API key', async () => {
      const providerNoKey = new OpenAICompatProvider({
        provider: 'openai-compat',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.2',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await providerNoKey.chat(mockChatRequest);

      const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<
        string,
        string
      >;
      expect(headers.Authorization).toBeUndefined();
    });

    it('should use default temperature and max tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatResponse),
      } as Response);

      await provider.chat({ messages: mockChatRequest.messages });

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(callBody.temperature).toBe(0.7);
      expect(callBody.max_tokens).toBe(4096);
    });
  });
});
