// LLM Provider Types

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool_calls';
}

export interface ChatStreamChunk {
  content: string;
  done: boolean;
  finishReason?: 'stop' | 'length' | 'tool_calls';
}

export interface LLMProviderConfig {
  provider: 'openrouter' | 'openai-compat';
  baseUrl: string;
  apiKey?: string;
  model: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}
