import type {
  ResearchSession,
  ResearchConfig,
  AgentPromptConfig,
  LoopExitCriteria,
  UserFeedback,
  Synthesis,
  KnowledgeEntry,
  AgentState,
} from '@deep-search/shared';
import {
  generateId,
  DEFAULT_RESEARCH_CONFIG,
  DEFAULT_EXIT_CRITERIA,
} from '@deep-search/shared';
import { db, schema } from '../../../database/client.js';
import { eq } from 'drizzle-orm';
import { getAgentPool } from '../../../core/agents/agent-pool.js';
import { OrchestratorAgent } from '../agents/orchestrator.js';
import { EventEmitter } from 'events';

export interface SessionManagerEvents {
  sessionCreated: (session: ResearchSession) => void;
  sessionUpdated: (session: ResearchSession) => void;
  sessionCompleted: (session: ResearchSession, synthesis: Synthesis) => void;
  sessionError: (sessionId: string, error: Error) => void;
}

export class SessionManager extends EventEmitter {
  private activeSessions: Map<string, OrchestratorAgent> = new Map();

  async createSession(
    topic: string,
    config?: Partial<ResearchConfig>,
    promptConfig?: AgentPromptConfig,
    exitCriteria?: Partial<LoopExitCriteria>
  ): Promise<ResearchSession> {
    const sessionId = generateId();

    const researchConfig: ResearchConfig = {
      ...DEFAULT_RESEARCH_CONFIG,
      ...config,
    };

    const finalExitCriteria: LoopExitCriteria = {
      ...DEFAULT_EXIT_CRITERIA,
      ...exitCriteria,
    };

    // Create session in database
    await db.insert(schema.researchSessions).values({
      id: sessionId,
      topic,
      status: 'planning',
      currentIteration: 0,
      config: researchConfig,
      promptConfig: promptConfig || null,
      exitCriteria: finalExitCriteria,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Failed to create session');
    }

    this.emit('sessionCreated', session);
    return session;
  }

  async startSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (this.activeSessions.has(sessionId)) {
      throw new Error('Session is already running');
    }

    // Create orchestrator agent
    const orchestrator = new OrchestratorAgent({
      id: generateId(),
      role: 'orchestrator',
      sessionId,
      topic: session.topic,
      researchConfig: session.config,
      promptConfig: session.promptConfig || undefined,
      exitCriteria: session.exitCriteria,
    });

    // Set up event handlers
    orchestrator.on('planCreated', async (plan) => {
      await this.updateSession(sessionId, { plan, status: 'researching' });
    });

    orchestrator.on('iterationComplete', async (iteration, findingsCount) => {
      await this.updateSession(sessionId, { currentIteration: iteration });
    });

    orchestrator.on('synthesisComplete', async (synthesis) => {
      // Store synthesis
      await db.insert(schema.syntheses).values({
        id: synthesis.id,
        sessionId,
        iteration: synthesis.iteration,
        isFinal: synthesis.isFinal,
        summary: synthesis.summary,
        keyFindings: synthesis.keyFindings,
        sections: synthesis.sections,
        confidence: synthesis.confidence,
        createdAt: new Date(),
      });
    });

    orchestrator.on('researchComplete', async (synthesis) => {
      await this.updateSession(sessionId, {
        status: 'completed',
        completedAt: new Date(),
      });

      const finalSession = await this.getSession(sessionId);
      if (finalSession) {
        this.emit('sessionCompleted', finalSession, synthesis);
      }

      this.activeSessions.delete(sessionId);
    });

    orchestrator.on('error', async (error) => {
      await this.updateSession(sessionId, { status: 'error' });
      this.emit('sessionError', sessionId, error);
      this.activeSessions.delete(sessionId);
    });

    this.activeSessions.set(sessionId, orchestrator);

    // Add to agent pool and start
    await getAgentPool().addAgent(orchestrator);

    // Run in background
    orchestrator.run().catch((error) => {
      console.error('Orchestrator error:', error);
    });
  }

  async getSession(sessionId: string): Promise<ResearchSession | null> {
    const result = await db.query.researchSessions.findFirst({
      where: eq(schema.researchSessions.id, sessionId),
    });

    if (!result) return null;

    const agentStates = this.activeSessions.has(sessionId)
      ? getAgentPool().getSessionAgentStates(sessionId)
      : [];

    return {
      id: result.id,
      topic: result.topic,
      status: result.status,
      config: result.config,
      promptConfig: result.promptConfig || undefined,
      exitCriteria: result.exitCriteria!,
      currentIteration: result.currentIteration || 0,
      plan: result.plan || undefined,
      agents: agentStates,
      createdAt: result.createdAt!,
      updatedAt: result.updatedAt!,
      completedAt: result.completedAt || undefined,
    };
  }

  async listSessions(limit = 20, offset = 0): Promise<ResearchSession[]> {
    const results = await db.query.researchSessions.findMany({
      limit,
      offset,
      orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
    });

    return results.map((result) => ({
      id: result.id,
      topic: result.topic,
      status: result.status,
      config: result.config,
      promptConfig: result.promptConfig || undefined,
      exitCriteria: result.exitCriteria!,
      currentIteration: result.currentIteration || 0,
      plan: result.plan || undefined,
      agents: [],
      createdAt: result.createdAt!,
      updatedAt: result.updatedAt!,
      completedAt: result.completedAt || undefined,
    }));
  }

  async updateSession(
    sessionId: string,
    updates: Partial<{
      status: ResearchSession['status'];
      currentIteration: number;
      plan: ResearchSession['plan'];
      completedAt: Date;
    }>
  ): Promise<void> {
    await db
      .update(schema.researchSessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.researchSessions.id, sessionId));

    const session = await this.getSession(sessionId);
    if (session) {
      this.emit('sessionUpdated', session);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Stop if running
    if (this.activeSessions.has(sessionId)) {
      await this.stopSession(sessionId);
    }

    // Delete from database
    await db.delete(schema.researchSessions).where(eq(schema.researchSessions.id, sessionId));
  }

  async stopSession(sessionId: string): Promise<void> {
    const orchestrator = this.activeSessions.get(sessionId);
    if (orchestrator) {
      orchestrator.requestStop();
    }
  }

  async pauseSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, { status: 'paused' });
    await this.stopSession(sessionId);
  }

  async resumeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'paused') {
      throw new Error('Session cannot be resumed');
    }

    await this.startSession(sessionId);
  }

  async submitFeedback(
    sessionId: string,
    type: UserFeedback['type'],
    content: string
  ): Promise<void> {
    const orchestrator = this.activeSessions.get(sessionId);
    if (!orchestrator) {
      throw new Error('Session is not active');
    }

    const feedback: UserFeedback = {
      id: generateId(),
      sessionId,
      iteration: orchestrator.getCurrentIteration(),
      timestamp: new Date(),
      type,
      content,
      processed: false,
    };

    // Store in database
    await db.insert(schema.userFeedback).values({
      id: feedback.id,
      sessionId,
      iteration: feedback.iteration,
      type: feedback.type,
      content: feedback.content,
      processed: false,
      createdAt: new Date(),
    });

    orchestrator.addFeedback(feedback);

    if (type === 'stop') {
      orchestrator.requestStop();
    }
  }

  async getSynthesis(sessionId: string, isFinal = false): Promise<Synthesis | null> {
    const result = await db.query.syntheses.findFirst({
      where: eq(schema.syntheses.sessionId, sessionId),
      orderBy: (syntheses, { desc }) => [desc(syntheses.createdAt)],
    });

    if (!result) return null;

    return {
      id: result.id,
      sessionId: result.sessionId!,
      iteration: result.iteration || 0,
      isFinal: result.isFinal || false,
      summary: result.summary,
      keyFindings: result.keyFindings,
      sections: result.sections,
      confidence: result.confidence || undefined,
      createdAt: result.createdAt!,
    };
  }

  async getSynthesisHistory(sessionId: string): Promise<Synthesis[]> {
    const results = await db.query.syntheses.findMany({
      where: eq(schema.syntheses.sessionId, sessionId),
      orderBy: (syntheses, { asc }) => [asc(syntheses.iteration)],
    });

    return results.map((result) => ({
      id: result.id,
      sessionId: result.sessionId!,
      iteration: result.iteration || 0,
      isFinal: result.isFinal || false,
      summary: result.summary,
      keyFindings: result.keyFindings,
      sections: result.sections,
      confidence: result.confidence || undefined,
      createdAt: result.createdAt!,
    }));
  }

  isSessionActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}
