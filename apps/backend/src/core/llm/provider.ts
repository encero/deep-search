import type {
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  LLMProviderConfig,
} from '@deep-search/shared';

export interface LLMProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
}

export abstract class BaseLLMProvider implements LLMProvider {
  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk>;

  protected getModel(request: ChatRequest): string {
    return request.model || this.config.model;
  }

  protected getTemperature(request: ChatRequest): number {
    return request.temperature ?? this.config.defaultTemperature ?? 0.7;
  }

  protected getMaxTokens(request: ChatRequest): number {
    return request.maxTokens ?? this.config.defaultMaxTokens ?? 4096;
  }
}
