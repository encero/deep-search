import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import routes from '../../src/modules/deep-research/routes.js';
import { mockResearchConfig, mockSynthesis } from '../fixtures/index.js';

// Mock the session manager
vi.mock('../../src/modules/deep-research/services/session-manager.js', () => {
  const mockSession = {
    id: 'session-123',
    topic: 'Test Topic',
    status: 'researching',
    config: {
      maxAgents: 3,
      maxSearchesPerAgent: 5,
      depthLevel: 'medium',
    },
    exitCriteria: {
      maxIterations: 10,
      maxDurationMinutes: 30,
      minConfidenceScore: 0.7,
      saturationThreshold: 0.1,
      requiredSubtopicCoverage: 0.8,
    },
    currentIteration: 2,
    agents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSynthesisData = {
    id: 'synthesis-123',
    sessionId: 'session-123',
    iteration: 2,
    isFinal: false,
    summary: 'Test summary',
    keyFindings: [],
    sections: [],
    createdAt: new Date(),
  };

  return {
    getSessionManager: () => ({
      createSession: vi.fn().mockResolvedValue(mockSession),
      startSession: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn().mockResolvedValue(mockSession),
      listSessions: vi.fn().mockResolvedValue([mockSession]),
      deleteSession: vi.fn().mockResolvedValue(undefined),
      pauseSession: vi.fn().mockResolvedValue(undefined),
      resumeSession: vi.fn().mockResolvedValue(undefined),
      submitFeedback: vi.fn().mockResolvedValue(undefined),
      getSynthesis: vi.fn().mockResolvedValue(mockSynthesisData),
      getSynthesisHistory: vi.fn().mockResolvedValue([mockSynthesisData]),
      isSessionActive: vi.fn().mockReturnValue(true),
    }),
  };
});

describe('Research API Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/research', routes);
  });

  describe('POST /api/research/sessions', () => {
    it('should create a new research session', async () => {
      const response = await request(app)
        .post('/api/research/sessions')
        .send({ topic: 'Machine Learning' })
        .expect(201);

      expect(response.body.session).toBeDefined();
      expect(response.body.session.topic).toBe('Test Topic');
    });

    it('should accept optional config', async () => {
      const response = await request(app)
        .post('/api/research/sessions')
        .send({
          topic: 'AI Research',
          config: {
            maxAgents: 5,
            depthLevel: 'deep',
          },
        })
        .expect(201);

      expect(response.body.session).toBeDefined();
    });

    it('should return 400 for missing topic', async () => {
      const response = await request(app)
        .post('/api/research/sessions')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for empty topic', async () => {
      const response = await request(app)
        .post('/api/research/sessions')
        .send({ topic: '' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate config options', async () => {
      const response = await request(app)
        .post('/api/research/sessions')
        .send({
          topic: 'Test',
          config: {
            maxAgents: 100, // Invalid: exceeds max of 10
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/research/sessions', () => {
    it('should list all sessions', async () => {
      const response = await request(app)
        .get('/api/research/sessions')
        .expect(200);

      expect(response.body.sessions).toBeInstanceOf(Array);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/research/sessions?limit=10&offset=5')
        .expect(200);

      expect(response.body.sessions).toBeDefined();
    });
  });

  describe('GET /api/research/sessions/:id', () => {
    it('should return session details', async () => {
      const response = await request(app)
        .get('/api/research/sessions/session-123')
        .expect(200);

      expect(response.body.session).toBeDefined();
      expect(response.body.session.id).toBe('session-123');
    });
  });

  describe('DELETE /api/research/sessions/:id', () => {
    it('should delete a session', async () => {
      await request(app)
        .delete('/api/research/sessions/session-123')
        .expect(204);
    });
  });

  describe('POST /api/research/sessions/:id/feedback', () => {
    it('should submit feedback', async () => {
      const response = await request(app)
        .post('/api/research/sessions/session-123/feedback')
        .send({
          type: 'guidance',
          content: 'Focus more on technical details',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate feedback type', async () => {
      const response = await request(app)
        .post('/api/research/sessions/session-123/feedback')
        .send({
          type: 'invalid-type',
          content: 'Some content',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require content', async () => {
      const response = await request(app)
        .post('/api/research/sessions/session-123/feedback')
        .send({
          type: 'approval',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/research/sessions/:id/finish', () => {
    it('should request immediate completion', async () => {
      const response = await request(app)
        .post('/api/research/sessions/session-123/finish')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/research/sessions/:id/pause', () => {
    it('should pause a session', async () => {
      const response = await request(app)
        .post('/api/research/sessions/session-123/pause')
        .expect(200);

      expect(response.body.session).toBeDefined();
    });
  });

  describe('POST /api/research/sessions/:id/resume', () => {
    it('should resume a paused session', async () => {
      const response = await request(app)
        .post('/api/research/sessions/session-123/resume')
        .expect(200);

      expect(response.body.session).toBeDefined();
    });
  });

  describe('GET /api/research/sessions/:id/synthesis', () => {
    it('should return current synthesis', async () => {
      const response = await request(app)
        .get('/api/research/sessions/session-123/synthesis')
        .expect(200);

      expect(response.body.synthesis).toBeDefined();
      expect(response.body.synthesis.summary).toBe('Test summary');
    });
  });

  describe('GET /api/research/sessions/:id/synthesis/history', () => {
    it('should return synthesis history', async () => {
      const response = await request(app)
        .get('/api/research/sessions/session-123/synthesis/history')
        .expect(200);

      expect(response.body.syntheses).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/research/sessions/:id/export', () => {
    it('should export as markdown by default', async () => {
      const response = await request(app)
        .get('/api/research/sessions/session-123/export')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/markdown');
    });

    it('should export as JSON when specified', async () => {
      const response = await request(app)
        .get('/api/research/sessions/session-123/export?format=json')
        .expect(200);

      expect(response.body.session).toBeDefined();
      expect(response.body.synthesis).toBeDefined();
    });

    it('should return 400 for unsupported format', async () => {
      const response = await request(app)
        .get('/api/research/sessions/session-123/export?format=pdf')
        .expect(400);

      expect(response.body.error).toContain('Unsupported format');
    });
  });
});
