import type { LLMProviderConfig } from '@deep-search/shared';
import { config } from '../../config/index.js';
import type { LLMProvider } from './provider.js';
import { OpenAICompatProvider } from './openai-compat.js';
import { OpenRouterProvider } from './openrouter.js';

export { type LLMProvider } from './provider.js';
export { OpenAICompatProvider } from './openai-compat.js';
export { OpenRouterProvider } from './openrouter.js';

let llmProviderInstance: LLMProvider | null = null;

export function createLLMProvider(providerConfig?: LLMProviderConfig): LLMProvider {
  const llmConfig: LLMProviderConfig = providerConfig || {
    provider: config.llm.provider,
    baseUrl: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
    model: config.llm.model,
    defaultTemperature: config.llm.defaultTemperature,
    defaultMaxTokens: config.llm.defaultMaxTokens,
  };

  switch (llmConfig.provider) {
    case 'openrouter':
      return new OpenRouterProvider(llmConfig);
    case 'openai-compat':
    default:
      return new OpenAICompatProvider(llmConfig);
  }
}

export function getLLMProvider(): LLMProvider {
  if (!llmProviderInstance) {
    llmProviderInstance = createLLMProvider();
  }
  return llmProviderInstance;
}

export function resetLLMProvider(): void {
  llmProviderInstance = null;
}
