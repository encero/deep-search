import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type {
  ClientEvent,
  ServerEvent,
  AgentState,
  ResearchPlan,
  Synthesis,
  KnowledgeGap,
} from '@deep-search/shared';
import { getSessionManager } from '../../modules/deep-research/services/session-manager.js';
import { getAgentPool } from '../agents/agent-pool.js';

interface ClientConnection {
  ws: WebSocket;
  sessionId?: string;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private sessionClients: Map<string, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupEventHandlers();
    this.setupSessionManagerListeners();
    this.setupAgentPoolListeners();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');
      this.clients.set(ws, { ws });

      ws.on('message', (data: Buffer) => {
        try {
          const event = JSON.parse(data.toString()) as ClientEvent;
          this.handleClientEvent(ws, event);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws);
      });
    });
  }

  private setupSessionManagerListeners(): void {
    const sessionManager = getSessionManager();

    sessionManager.on('sessionCreated', (session) => {
      // No need to broadcast - client that created it will get response
    });

    sessionManager.on('sessionUpdated', (session) => {
      this.broadcastToSession(session.id, {
        type: 'session_status',
        sessionId: session.id,
        status: session.status,
        iteration: session.currentIteration,
      });
    });

    sessionManager.on('sessionCompleted', (session, synthesis) => {
      this.broadcastToSession(session.id, {
        type: 'research_complete',
        sessionId: session.id,
        synthesis,
        totalIterations: session.currentIteration,
        totalSources: synthesis.sections.reduce((acc, s) => acc + s.sources.length, 0),
      });
    });

    sessionManager.on('sessionError', (sessionId, error) => {
      this.broadcastToSession(sessionId, {
        type: 'error',
        sessionId,
        error: error.message,
      });
    });
  }

  private setupAgentPoolListeners(): void {
    const agentPool = getAgentPool();

    agentPool.on('agentSpawned', (agent) => {
      this.broadcastToSession(agent.sessionId, {
        type: 'agent_spawned',
        sessionId: agent.sessionId,
        agent: agent.getState(),
      });
    });

    agentPool.on('agentStatusChange', (agentId, status) => {
      const agent = agentPool.getAgent(agentId);
      if (agent) {
        this.broadcastToSession(agent.sessionId, {
          type: 'agent_status',
          sessionId: agent.sessionId,
          agentId,
          status,
          currentTask: agent.getState().currentTask,
        });
      }
    });

    agentPool.on('agentProgress', (agentId, progress, task) => {
      const agent = agentPool.getAgent(agentId);
      if (agent) {
        this.broadcastToSession(agent.sessionId, {
          type: 'agent_progress',
          sessionId: agent.sessionId,
          agentId,
          progress,
          currentTask: task,
        });
      }
    });

    agentPool.on('agentError', (agentId, error) => {
      const agent = agentPool.getAgent(agentId);
      if (agent) {
        this.broadcastToSession(agent.sessionId, {
          type: 'agent_status',
          sessionId: agent.sessionId,
          agentId,
          status: 'error',
          error: error.message,
        });
      }
    });
  }

  private handleClientEvent(ws: WebSocket, event: ClientEvent): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (event.type) {
      case 'join_session':
        this.handleJoinSession(ws, event.sessionId);
        break;

      case 'leave_session':
        this.handleLeaveSession(ws, event.sessionId);
        break;

      case 'send_feedback':
        this.handleSendFeedback(event.sessionId, event.feedbackType, event.content);
        break;

      case 'request_finish':
        this.handleRequestFinish(event.sessionId);
        break;
    }
  }

  private handleJoinSession(ws: WebSocket, sessionId: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    // Leave previous session if any
    if (client.sessionId) {
      this.handleLeaveSession(ws, client.sessionId);
    }

    // Join new session
    client.sessionId = sessionId;

    if (!this.sessionClients.has(sessionId)) {
      this.sessionClients.set(sessionId, new Set());
    }
    this.sessionClients.get(sessionId)!.add(ws);

    console.log(`Client joined session ${sessionId}`);
  }

  private handleLeaveSession(ws: WebSocket, sessionId: string): void {
    const sessionClients = this.sessionClients.get(sessionId);
    if (sessionClients) {
      sessionClients.delete(ws);
      if (sessionClients.size === 0) {
        this.sessionClients.delete(sessionId);
      }
    }

    const client = this.clients.get(ws);
    if (client && client.sessionId === sessionId) {
      client.sessionId = undefined;
    }

    console.log(`Client left session ${sessionId}`);
  }

  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client?.sessionId) {
      this.handleLeaveSession(ws, client.sessionId);
    }
    this.clients.delete(ws);
    console.log('WebSocket client disconnected');
  }

  private async handleSendFeedback(
    sessionId: string,
    type: 'guidance' | 'approval' | 'stop' | 'redirect',
    content: string
  ): Promise<void> {
    try {
      await getSessionManager().submitFeedback(sessionId, type, content);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }

  private async handleRequestFinish(sessionId: string): Promise<void> {
    try {
      await getSessionManager().submitFeedback(sessionId, 'stop', 'User requested completion');
    } catch (error) {
      console.error('Failed to request finish:', error);
    }
  }

  private broadcastToSession(sessionId: string, event: ServerEvent): void {
    const clients = this.sessionClients.get(sessionId);
    if (!clients) return;

    const message = JSON.stringify(event);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  // Public methods for emitting events from other parts of the application
  emitPlanCreated(sessionId: string, plan: ResearchPlan): void {
    this.broadcastToSession(sessionId, {
      type: 'plan_created',
      sessionId,
      plan,
    });
  }

  emitIterationStarted(sessionId: string, iteration: number): void {
    this.broadcastToSession(sessionId, {
      type: 'iteration_started',
      sessionId,
      iteration,
    });
  }

  emitIterationComplete(sessionId: string, iteration: number, findingsCount: number): void {
    this.broadcastToSession(sessionId, {
      type: 'iteration_complete',
      sessionId,
      iteration,
      findingsCount,
    });
  }

  emitSynthesisChunk(sessionId: string, content: string, section?: string): void {
    this.broadcastToSession(sessionId, {
      type: 'synthesis_chunk',
      sessionId,
      content,
      section,
    });
  }

  emitSynthesisComplete(sessionId: string, synthesis: Synthesis): void {
    this.broadcastToSession(sessionId, {
      type: 'synthesis_complete',
      sessionId,
      synthesis,
    });
  }

  emitKnowledgeUpdated(
    sessionId: string,
    totalEntries: number,
    coverage: number,
    gaps: KnowledgeGap[]
  ): void {
    this.broadcastToSession(sessionId, {
      type: 'knowledge_updated',
      sessionId,
      totalEntries,
      coverage,
      gaps,
    });
  }

  close(): void {
    this.wss.close();
  }
}

let wsHandlerInstance: WebSocketHandler | null = null;

export function initializeWebSocket(server: Server): WebSocketHandler {
  if (!wsHandlerInstance) {
    wsHandlerInstance = new WebSocketHandler(server);
  }
  return wsHandlerInstance;
}

export function getWebSocketHandler(): WebSocketHandler | null {
  return wsHandlerInstance;
}
