import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createLLMProvider,
  getLLMProvider,
  resetLLMProvider,
  OpenAICompatProvider,
  OpenRouterProvider,
} from '../../../src/core/llm/index.js';

// Mock the config module
vi.mock('../../../src/config/index.js', () => ({
  config: {
    llm: {
      provider: 'openai-compat',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'llama3.2',
      defaultTemperature: 0.7,
      defaultMaxTokens: 4096,
    },
  },
}));

describe('LLM Provider Factory', () => {
  beforeEach(() => {
    resetLLMProvider();
  });

  afterEach(() => {
    resetLLMProvider();
  });

  describe('createLLMProvider', () => {
    it('should create OpenAICompatProvider for openai-compat provider', () => {
      const provider = createLLMProvider({
        provider: 'openai-compat',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.2',
      });

      expect(provider).toBeInstanceOf(OpenAICompatProvider);
    });

    it('should create OpenRouterProvider for openrouter provider', () => {
      const provider = createLLMProvider({
        provider: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: 'test-key',
        model: 'anthropic/claude-3-haiku',
      });

      expect(provider).toBeInstanceOf(OpenRouterProvider);
    });

    it('should default to OpenAICompatProvider for unknown provider', () => {
      const provider = createLLMProvider({
        provider: 'unknown' as any,
        baseUrl: 'http://localhost:11434/v1',
        model: 'test',
      });

      expect(provider).toBeInstanceOf(OpenAICompatProvider);
    });

    it('should use config values when no config is provided', () => {
      const provider = createLLMProvider();
      expect(provider).toBeInstanceOf(OpenAICompatProvider);
    });
  });

  describe('getLLMProvider', () => {
    it('should return singleton instance', () => {
      const provider1 = getLLMProvider();
      const provider2 = getLLMProvider();

      expect(provider1).toBe(provider2);
    });

    it('should create new instance after reset', () => {
      const provider1 = getLLMProvider();
      resetLLMProvider();
      const provider2 = getLLMProvider();

      expect(provider1).not.toBe(provider2);
    });
  });

  describe('resetLLMProvider', () => {
    it('should reset the singleton instance', () => {
      const provider1 = getLLMProvider();
      resetLLMProvider();
      const provider2 = getLLMProvider();

      expect(provider1).not.toBe(provider2);
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        resetLLMProvider();
        resetLLMProvider();
        resetLLMProvider();
      }).not.toThrow();
    });
  });
});
