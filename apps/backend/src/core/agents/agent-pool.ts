import type { AgentRole, AgentState } from '@deep-search/shared';
import type { BaseAgent } from './base-agent.js';
import { EventEmitter } from 'events';

export interface AgentPoolEvents {
  agentSpawned: (agent: BaseAgent) => void;
  agentStopped: (agentId: string) => void;
  agentStatusChange: (agentId: string, status: AgentState['status']) => void;
  agentProgress: (agentId: string, progress: number, task?: string) => void;
  agentError: (agentId: string, error: Error) => void;
}

export class AgentPool extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private sessionAgents: Map<string, Set<string>> = new Map();

  // Add an agent to the pool
  async addAgent(agent: BaseAgent): Promise<void> {
    this.agents.set(agent.id, agent);

    // Track by session
    if (!this.sessionAgents.has(agent.sessionId)) {
      this.sessionAgents.set(agent.sessionId, new Set());
    }
    this.sessionAgents.get(agent.sessionId)!.add(agent.id);

    // Listen to agent events
    agent.on('statusChange', (status: AgentState['status']) => {
      this.emit('agentStatusChange', agent.id, status);
    });

    agent.on('progress', (progress: number, task?: string) => {
      this.emit('agentProgress', agent.id, progress, task);
    });

    agent.on('error', (error: Error) => {
      this.emit('agentError', agent.id, error);
    });

    // Start the agent
    await agent.start();
    this.emit('agentSpawned', agent);
  }

  // Get an agent by ID
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  // Get all agents for a session
  getSessionAgents(sessionId: string): BaseAgent[] {
    const agentIds = this.sessionAgents.get(sessionId) || new Set();
    return Array.from(agentIds)
      .map((id) => this.agents.get(id))
      .filter((agent): agent is BaseAgent => agent !== undefined);
  }

  // Get all agents by role for a session
  getAgentsByRole(sessionId: string, role: AgentRole): BaseAgent[] {
    return this.getSessionAgents(sessionId).filter((agent) => agent.role === role);
  }

  // Get all agent states for a session
  getSessionAgentStates(sessionId: string): AgentState[] {
    return this.getSessionAgents(sessionId).map((agent) => agent.getState());
  }

  // Remove an agent from the pool
  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    await agent.stop();
    this.agents.delete(agentId);

    // Remove from session tracking
    const sessionAgents = this.sessionAgents.get(agent.sessionId);
    if (sessionAgents) {
      sessionAgents.delete(agentId);
      if (sessionAgents.size === 0) {
        this.sessionAgents.delete(agent.sessionId);
      }
    }

    this.emit('agentStopped', agentId);
  }

  // Remove all agents for a session
  async removeSessionAgents(sessionId: string): Promise<void> {
    const agentIds = this.sessionAgents.get(sessionId);
    if (!agentIds) return;

    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (agent) {
        await agent.stop();
        this.agents.delete(agentId);
        this.emit('agentStopped', agentId);
      }
    }

    this.sessionAgents.delete(sessionId);
  }

  // Get pool statistics
  getStats(): {
    totalAgents: number;
    agentsBySession: Record<string, number>;
    agentsByRole: Record<AgentRole, number>;
  } {
    const agentsByRole: Record<AgentRole, number> = {
      orchestrator: 0,
      researcher: 0,
      synthesizer: 0,
    };

    for (const agent of this.agents.values()) {
      agentsByRole[agent.role]++;
    }

    const agentsBySession: Record<string, number> = {};
    for (const [sessionId, agentIds] of this.sessionAgents) {
      agentsBySession[sessionId] = agentIds.size;
    }

    return {
      totalAgents: this.agents.size,
      agentsBySession,
      agentsByRole,
    };
  }

  // Clear the pool
  async clear(): Promise<void> {
    for (const agent of this.agents.values()) {
      await agent.stop();
    }
    this.agents.clear();
    this.sessionAgents.clear();
  }
}

// Singleton instance
let agentPoolInstance: AgentPool | null = null;

export function getAgentPool(): AgentPool {
  if (!agentPoolInstance) {
    agentPoolInstance = new AgentPool();
  }
  return agentPoolInstance;
}

export function resetAgentPool(): void {
  if (agentPoolInstance) {
    agentPoolInstance.clear();
    agentPoolInstance = null;
  }
}
