import { config as dotenvConfig } from 'dotenv';
import { configSchema, type Config } from './schema.js';

// Load environment variables
dotenvConfig();

function loadConfig(): Config {
  const rawConfig = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    llm: {
      provider: process.env.LLM_PROVIDER,
      baseUrl: process.env.LLM_BASE_URL,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL,
      defaultTemperature: process.env.LLM_DEFAULT_TEMPERATURE,
      defaultMaxTokens: process.env.LLM_DEFAULT_MAX_TOKENS,
    },
    search: {
      provider: process.env.SEARCH_PROVIDER,
      searxngUrl: process.env.SEARXNG_URL,
      scraperTimeout: process.env.SCRAPER_TIMEOUT,
      scraperMaxConcurrent: process.env.SCRAPER_MAX_CONCURRENT,
      scraperUserAgent: process.env.SCRAPER_USER_AGENT,
    },
    research: {
      defaultMaxAgents: process.env.DEFAULT_MAX_AGENTS,
      defaultMaxSearchesPerAgent: process.env.DEFAULT_MAX_SEARCHES_PER_AGENT,
      defaultDepthLevel: process.env.DEFAULT_DEPTH_LEVEL,
    },
  };

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export const config = loadConfig();
export type { Config } from './schema.js';
