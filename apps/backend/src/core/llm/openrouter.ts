import type {
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  LLMProviderConfig,
} from '@deep-search/shared';
import { BaseLLMProvider } from './provider.js';

interface OpenRouterChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
}

interface OpenRouterChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class OpenRouterProvider extends BaseLLMProvider {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: LLMProviderConfig) {
    super(config);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const body: OpenRouterChatRequest = {
      model: this.getModel(request),
      messages: request.messages,
      temperature: this.getTemperature(request),
      max_tokens: this.getMaxTokens(request),
      stream: false,
    };

    if (request.stopSequences?.length) {
      body.stop = request.stopSequences;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://deep-search.local',
        'X-Title': 'Deep Search',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data: OpenRouterChatResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
    };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const url = `${this.baseUrl}/chat/completions`;

    const body: OpenRouterChatRequest = {
      model: this.getModel(request),
      messages: request.messages,
      temperature: this.getTemperature(request),
      max_tokens: this.getMaxTokens(request),
      stream: true,
    };

    if (request.stopSequences?.length) {
      body.stop = request.stopSequences;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://deep-search.local',
        'X-Title': 'Deep Search',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        yield { content: '', done: true };
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') {
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const data: OpenRouterStreamChunk = JSON.parse(trimmed.slice(6));
            const content = data.choices[0]?.delta?.content || '';
            const finishReason = data.choices[0]?.finish_reason;

            yield {
              content,
              done: finishReason !== null,
              finishReason: this.mapFinishReason(finishReason),
            };
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): 'stop' | 'length' | 'tool_calls' | undefined {
    if (!reason) return undefined;
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
      case 'function_call':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }
}
