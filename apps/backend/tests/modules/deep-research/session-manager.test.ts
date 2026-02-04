import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockResearchConfig, mockExitCriteria } from '../../fixtures/index.js';

// Mock modules before imports
vi.mock('../../../src/database/client.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    query: {
      researchSessions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      syntheses: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
  schema: {
    researchSessions: { _: { name: 'research_sessions' } },
    syntheses: { _: { name: 'syntheses' } },
    userFeedback: { _: { name: 'user_feedback' } },
  },
}));

// Mock the agent pool
vi.mock('../../../src/core/agents/agent-pool.js', () => ({
  getAgentPool: () => ({
    addAgent: vi.fn().mockResolvedValue(undefined),
    removeAgent: vi.fn().mockResolvedValue(undefined),
    getSessionAgentStates: vi.fn().mockReturnValue([]),
    removeSessionAgents: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock the orchestrator agent
vi.mock('../../../src/modules/deep-research/agents/orchestrator.js', () => ({
  OrchestratorAgent: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    run: vi.fn().mockResolvedValue(undefined),
    getCurrentIteration: vi.fn().mockReturnValue(1),
    addFeedback: vi.fn(),
    requestStop: vi.fn(),
  })),
}));

// Import after mocks are defined
import { SessionManager } from '../../../src/modules/deep-research/services/session-manager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up mock return values
    const { db } = await import('../../../src/database/client.js');

    vi.mocked(db.query.researchSessions.findFirst).mockResolvedValue({
      id: 'session-123',
      topic: 'Test Topic',
      status: 'researching',
      currentIteration: 2,
      config: mockResearchConfig,
      exitCriteria: mockExitCriteria,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(db.query.researchSessions.findMany).mockResolvedValue([
      {
        id: 'session-1',
        topic: 'Topic 1',
        status: 'completed',
        currentIteration: 5,
        config: mockResearchConfig,
        exitCriteria: mockExitCriteria,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'session-2',
        topic: 'Topic 2',
        status: 'researching',
        currentIteration: 2,
        config: mockResearchConfig,
        exitCriteria: mockExitCriteria,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    vi.mocked(db.query.syntheses.findFirst).mockResolvedValue({
      id: 'synthesis-123',
      sessionId: 'session-123',
      iteration: 2,
      isFinal: false,
      summary: 'Test summary',
      keyFindings: [],
      sections: [],
      createdAt: new Date(),
    });

    vi.mocked(db.query.syntheses.findMany).mockResolvedValue([
      {
        id: 'synthesis-1',
        sessionId: 'session-123',
        iteration: 1,
        isFinal: false,
        summary: 'Iteration 1 summary',
        keyFindings: [],
        sections: [],
        createdAt: new Date(),
      },
      {
        id: 'synthesis-2',
        sessionId: 'session-123',
        iteration: 2,
        isFinal: false,
        summary: 'Iteration 2 summary',
        keyFindings: [],
        sections: [],
        createdAt: new Date(),
      },
    ]);

    sessionManager = new SessionManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session with default config', async () => {
      const session = await sessionManager.createSession('Machine Learning');

      expect(session).toBeDefined();
      expect(session.topic).toBe('Test Topic');
      expect(session.status).toBe('researching');
    });

    it('should create session with custom config', async () => {
      const session = await sessionManager.createSession(
        'AI Research',
        { maxAgents: 5, depthLevel: 'deep' }
      );

      expect(session).toBeDefined();
    });

    it('should create session with prompt config', async () => {
      const session = await sessionManager.createSession(
        'Research Topic',
        undefined,
        {
          researcherInstructions: 'Focus on peer-reviewed sources',
          outputTone: 'academic',
        }
      );

      expect(session).toBeDefined();
    });

    it('should create session with custom exit criteria', async () => {
      const session = await sessionManager.createSession(
        'Research Topic',
        undefined,
        undefined,
        { maxIterations: 5, maxDurationMinutes: 15 }
      );

      expect(session).toBeDefined();
    });

    it('should emit sessionCreated event', async () => {
      const handler = vi.fn();
      sessionManager.on('sessionCreated', handler);

      await sessionManager.createSession('Test Topic');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return session by ID', async () => {
      const session = await sessionManager.getSession('session-123');

      expect(session).toBeDefined();
      expect(session?.id).toBe('session-123');
    });

    it('should return null for non-existent session', async () => {
      const { db } = await import('../../../src/database/client.js');
      vi.mocked(db.query.researchSessions.findFirst).mockResolvedValueOnce(null);

      const session = await sessionManager.getSession('non-existent');

      expect(session).toBeNull();
    });
  });

  describe('listSessions', () => {
    it('should return list of sessions', async () => {
      const sessions = await sessionManager.listSessions();

      expect(sessions).toBeInstanceOf(Array);
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const sessions = await sessionManager.listSessions(10, 5);

      expect(sessions).toBeInstanceOf(Array);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      await expect(sessionManager.deleteSession('session-123')).resolves.not.toThrow();
    });
  });

  describe('submitFeedback', () => {
    it('should throw for inactive session', async () => {
      // Session is not active (not in activeSessions map)
      await expect(
        sessionManager.submitFeedback('session-123', 'guidance', 'More detail please')
      ).rejects.toThrow('Session is not active');
    });
  });

  describe('getSynthesis', () => {
    it('should return current synthesis', async () => {
      const synthesis = await sessionManager.getSynthesis('session-123');

      expect(synthesis).toBeDefined();
      expect(synthesis?.summary).toBe('Test summary');
    });

    it('should return null when no synthesis exists', async () => {
      const { db } = await import('../../../src/database/client.js');
      vi.mocked(db.query.syntheses.findFirst).mockResolvedValueOnce(null);

      const synthesis = await sessionManager.getSynthesis('session-123');

      expect(synthesis).toBeNull();
    });
  });

  describe('getSynthesisHistory', () => {
    it('should return all syntheses for session', async () => {
      const syntheses = await sessionManager.getSynthesisHistory('session-123');

      expect(syntheses).toBeInstanceOf(Array);
      expect(syntheses.length).toBe(2);
      expect(syntheses[0].iteration).toBe(1);
      expect(syntheses[1].iteration).toBe(2);
    });
  });

  describe('isSessionActive', () => {
    it('should return false for non-active session', () => {
      expect(sessionManager.isSessionActive('session-123')).toBe(false);
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return count of active sessions', () => {
      expect(sessionManager.getActiveSessionCount()).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit sessionUpdated on update', async () => {
      const handler = vi.fn();
      sessionManager.on('sessionUpdated', handler);

      // Trigger an update
      await sessionManager['updateSession']('session-123', { currentIteration: 3 });

      expect(handler).toHaveBeenCalled();
    });
  });
});
