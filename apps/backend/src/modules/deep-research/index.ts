import type { Express } from 'express';
import routes from './routes.js';
import { getSessionManager } from './services/session-manager.js';

export function registerDeepResearchModule(app: Express): void {
  // Register routes
  app.use('/api/research', routes);

  console.log('Deep Research module registered');
}

export { getSessionManager } from './services/session-manager.js';
export { OrchestratorAgent } from './agents/orchestrator.js';
export { ResearcherAgent } from './agents/researcher.js';
export { SynthesizerAgent } from './agents/synthesizer.js';
