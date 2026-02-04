import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getSessionManager } from './services/session-manager.js';

const router = Router();
const sessionManager = getSessionManager();

// Validation schemas
const createSessionSchema = z.object({
  topic: z.string().min(1).max(500),
  config: z
    .object({
      maxAgents: z.number().int().min(1).max(10).optional(),
      maxSearchesPerAgent: z.number().int().min(1).max(20).optional(),
      depthLevel: z.enum(['shallow', 'medium', 'deep']).optional(),
      focusAreas: z.array(z.string()).optional(),
      excludeTopics: z.array(z.string()).optional(),
    })
    .optional(),
  promptConfig: z
    .object({
      orchestratorPrompt: z.string().optional(),
      researcherPrompt: z.string().optional(),
      synthesizerPrompt: z.string().optional(),
      orchestratorInstructions: z.string().optional(),
      researcherInstructions: z.string().optional(),
      synthesizerInstructions: z.string().optional(),
      researchStyle: z.enum(['academic', 'journalistic', 'technical', 'general']).optional(),
      outputTone: z.enum(['formal', 'casual', 'technical']).optional(),
      domainContext: z.string().optional(),
      priorKnowledge: z.string().optional(),
      avoidTopics: z.array(z.string()).optional(),
      requiredSources: z.array(z.string()).optional(),
      excludedSources: z.array(z.string()).optional(),
    })
    .optional(),
  exitCriteria: z
    .object({
      maxIterations: z.number().int().min(1).max(50).optional(),
      maxDurationMinutes: z.number().int().min(1).max(180).optional(),
      minConfidenceScore: z.number().min(0).max(1).optional(),
      saturationThreshold: z.number().min(0).max(1).optional(),
      requiredSubtopicCoverage: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const feedbackSchema = z.object({
  type: z.enum(['guidance', 'approval', 'stop', 'redirect']),
  content: z.string().min(1),
});

// Error handler wrapper
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error) => {
      console.error('API Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    });
  };
}

// POST /api/research/sessions - Create new session
router.post(
  '/sessions',
  asyncHandler(async (req, res) => {
    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.format() });
      return;
    }

    const { topic, config, promptConfig, exitCriteria } = validation.data;

    const session = await sessionManager.createSession(
      topic,
      config,
      promptConfig,
      exitCriteria
    );

    // Automatically start the session
    await sessionManager.startSession(session.id);

    res.status(201).json({ session });
  })
);

// GET /api/research/sessions - List all sessions
router.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const sessions = await sessionManager.listSessions(limit, offset);
    res.json({ sessions });
  })
);

// GET /api/research/sessions/:id - Get session details
router.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = await sessionManager.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  })
);

// DELETE /api/research/sessions/:id - Cancel/delete session
router.delete(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    await sessionManager.deleteSession(req.params.id);
    res.status(204).send();
  })
);

// POST /api/research/sessions/:id/resume - Resume a paused session
router.post(
  '/sessions/:id/resume',
  asyncHandler(async (req, res) => {
    await sessionManager.resumeSession(req.params.id);
    const session = await sessionManager.getSession(req.params.id);
    res.json({ session });
  })
);

// POST /api/research/sessions/:id/feedback - Submit user feedback
router.post(
  '/sessions/:id/feedback',
  asyncHandler(async (req, res) => {
    const validation = feedbackSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.format() });
      return;
    }

    const { type, content } = validation.data;
    await sessionManager.submitFeedback(req.params.id, type, content);
    res.json({ success: true });
  })
);

// POST /api/research/sessions/:id/finish - Request immediate completion
router.post(
  '/sessions/:id/finish',
  asyncHandler(async (req, res) => {
    await sessionManager.submitFeedback(req.params.id, 'stop', 'User requested completion');
    res.json({ success: true });
  })
);

// POST /api/research/sessions/:id/pause - Pause research loop
router.post(
  '/sessions/:id/pause',
  asyncHandler(async (req, res) => {
    await sessionManager.pauseSession(req.params.id);
    const session = await sessionManager.getSession(req.params.id);
    res.json({ session });
  })
);

// GET /api/research/sessions/:id/synthesis - Get current/final synthesis
router.get(
  '/sessions/:id/synthesis',
  asyncHandler(async (req, res) => {
    const synthesis = await sessionManager.getSynthesis(req.params.id);
    if (!synthesis) {
      res.status(404).json({ error: 'No synthesis available' });
      return;
    }
    res.json({ synthesis });
  })
);

// GET /api/research/sessions/:id/synthesis/history - Get all iteration syntheses
router.get(
  '/sessions/:id/synthesis/history',
  asyncHandler(async (req, res) => {
    const syntheses = await sessionManager.getSynthesisHistory(req.params.id);
    res.json({ syntheses });
  })
);

// GET /api/research/sessions/:id/export - Export results
router.get(
  '/sessions/:id/export',
  asyncHandler(async (req, res) => {
    const format = (req.query.format as string) || 'markdown';
    const synthesis = await sessionManager.getSynthesis(req.params.id);
    const session = await sessionManager.getSession(req.params.id);

    if (!synthesis || !session) {
      res.status(404).json({ error: 'Session or synthesis not found' });
      return;
    }

    if (format === 'markdown') {
      let markdown = `# ${session.topic}\n\n`;
      markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
      markdown += `## Summary\n\n${synthesis.summary}\n\n`;
      markdown += `## Key Findings\n\n`;

      for (const finding of synthesis.keyFindings) {
        const icon = finding.importance === 'high' ? '⭐' : finding.importance === 'medium' ? '◆' : '○';
        markdown += `${icon} **${finding.title}**\n\n${finding.description}\n\n`;
      }

      markdown += `## Detailed Sections\n\n`;
      for (const section of synthesis.sections) {
        markdown += `### ${section.title}\n\n${section.content}\n\n`;
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${session.topic.slice(0, 50)}.md"`);
      res.send(markdown);
    } else if (format === 'json') {
      res.json({
        session: {
          id: session.id,
          topic: session.topic,
          completedAt: session.completedAt,
          iterations: session.currentIteration,
        },
        synthesis,
      });
    } else {
      res.status(400).json({ error: 'Unsupported format. Use "markdown" or "json".' });
    }
  })
);

export default router;
