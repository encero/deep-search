// Export all types
export * from './types/agents';
export * from './types/events';
export * from './types/knowledge';
export * from './types/llm';
export * from './types/messages';
export * from './types/research';
export * from './types/search';

// Utility functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Default configurations
export const DEFAULT_RESEARCH_CONFIG = {
  maxAgents: 3,
  maxSearchesPerAgent: 5,
  depthLevel: 'medium' as const,
};

export const DEFAULT_EXIT_CRITERIA = {
  maxIterations: 10,
  maxDurationMinutes: 30,
  minConfidenceScore: 0.7,
  saturationThreshold: 0.1,
  requiredSubtopicCoverage: 0.8,
};

export const DEFAULT_LLM_CONFIG = {
  provider: 'openai-compat' as const,
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.2',
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
};

export const DEFAULT_SEARCH_CONFIG = {
  provider: 'scraper' as const,
  scraperTimeout: 30000,
  scraperMaxConcurrent: 5,
  scraperUserAgent: 'DeepSearch/1.0',
};
