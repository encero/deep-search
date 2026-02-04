import { z } from 'zod';

export const configSchema = z.object({
  // Server
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  databaseUrl: z.string().default('file:./data/deep-search.db'),

  // LLM Provider
  llm: z.object({
    provider: z.enum(['openrouter', 'openai-compat']).default('openai-compat'),
    baseUrl: z.string().default('http://localhost:11434/v1'),
    apiKey: z.string().optional(),
    model: z.string().default('llama3.2'),
    defaultTemperature: z.coerce.number().default(0.7),
    defaultMaxTokens: z.coerce.number().default(4096),
  }),

  // Search Provider
  search: z.object({
    provider: z.enum(['searxng', 'scraper']).default('scraper'),
    searxngUrl: z.string().optional(),
    scraperTimeout: z.coerce.number().default(30000),
    scraperMaxConcurrent: z.coerce.number().default(5),
    scraperUserAgent: z.string().default('DeepSearch/1.0'),
  }),

  // Research Defaults
  research: z.object({
    defaultMaxAgents: z.coerce.number().default(3),
    defaultMaxSearchesPerAgent: z.coerce.number().default(5),
    defaultDepthLevel: z.enum(['shallow', 'medium', 'deep']).default('medium'),
  }),
});

export type Config = z.infer<typeof configSchema>;
