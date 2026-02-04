import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentPool, getAgentPool, resetAgentPool } from '../../../src/core/agents/agent-pool.js';
import { BaseAgent } from '../../../src/core/agents/base-agent.js';
import type { AgentMessage } from '@deep-search/shared';

// Create a concrete test agent
class TestAgent extends BaseAgent {
  constructor(config: { id: string; sessionId: string; role: 'researcher' | 'orchestrator' | 'synthesizer' }) {
    super({
      id: config.id,
      role: config.role,
      sessionId: config.sessionId,
    });
  }

  async run(): Promise<void> {
    this.updateStatus('completed');
  }

  async handleMessage(_message: AgentMessage): Promise<void> {
    // No-op for tests
  }
}

describe('AgentPool', () => {
  let pool: AgentPool;

  beforeEach(async () => {
    await resetAgentPool();
    pool = new AgentPool();
  });

  afterEach(async () => {
    await pool.clear();
    await resetAgentPool();
  });

  describe('addAgent', () => {
    it('should add an agent to the pool', async () => {
      const agent = new TestAgent({
        id: 'agent-1',
        sessionId: 'session-1',
        role: 'researcher',
      });

      await pool.addAgent(agent);

      expect(pool.getAgent('agent-1')).toBe(agent);
    });

    it('should emit agentSpawned event', async () => {
      const handler = vi.fn();
      pool.on('agentSpawned', handler);

      const agent = new TestAgent({
        id: 'agent-1',
        sessionId: 'session-1',
        role: 'researcher',
      });

      await pool.addAgent(agent);

      expect(handler).toHaveBeenCalledWith(agent);
    });

    it('should track agent by session', async () => {
      const agent = new TestAgent({
        id: 'agent-1',
        sessionId: 'session-1',
        role: 'researcher',
      });

      await pool.addAgent(agent);

      const sessionAgents = pool.getSessionAgents('session-1');
      expect(sessionAgents).toContain(agent);
    });

    it('should listen to agent events', async () => {
      const statusHandler = vi.fn();
      pool.on('agentStatusChange', statusHandler);

      const agent = new TestAgent({
        id: 'agent-1',
        sessionId: 'session-1',
        role: 'researcher',
      });

      await pool.addAgent(agent);
      agent.emit('statusChange', 'analyzing', 'idle');

      expect(statusHandler).toHaveBeenCalledWith('agent-1', 'analyzing');
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', async () => {
      const agent = new TestAgent({
        id: 'agent-1',
        sessionId: 'session-1',
        role: 'researcher',
      });

      await pool.addAgent(agent);

      expect(pool.getAgent('agent-1')).toBe(agent);
    });

    it('should return undefined for non-existent agent', () => {
      expect(pool.getAgent('non-existent')).toBeUndefined();
    });
  });

  describe('getSessionAgents', () => {
    it('should return all agents for a session', async () => {
      const agent1 = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      const agent2 = new TestAgent({ id: 'agent-2', sessionId: 'session-1', role: 'synthesizer' });
      const agent3 = new TestAgent({ id: 'agent-3', sessionId: 'session-2', role: 'researcher' });

      await pool.addAgent(agent1);
      await pool.addAgent(agent2);
      await pool.addAgent(agent3);

      const session1Agents = pool.getSessionAgents('session-1');
      expect(session1Agents).toHaveLength(2);
      expect(session1Agents).toContain(agent1);
      expect(session1Agents).toContain(agent2);
      expect(session1Agents).not.toContain(agent3);
    });

    it('should return empty array for session with no agents', () => {
      expect(pool.getSessionAgents('non-existent')).toEqual([]);
    });
  });

  describe('getAgentsByRole', () => {
    it('should return agents filtered by role', async () => {
      const researcher1 = new TestAgent({ id: 'r1', sessionId: 'session-1', role: 'researcher' });
      const researcher2 = new TestAgent({ id: 'r2', sessionId: 'session-1', role: 'researcher' });
      const synthesizer = new TestAgent({ id: 's1', sessionId: 'session-1', role: 'synthesizer' });

      await pool.addAgent(researcher1);
      await pool.addAgent(researcher2);
      await pool.addAgent(synthesizer);

      const researchers = pool.getAgentsByRole('session-1', 'researcher');
      expect(researchers).toHaveLength(2);
      expect(researchers).toContain(researcher1);
      expect(researchers).toContain(researcher2);
    });
  });

  describe('getSessionAgentStates', () => {
    it('should return states of all session agents', async () => {
      const agent = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      await pool.addAgent(agent);

      const states = pool.getSessionAgentStates('session-1');

      expect(states).toHaveLength(1);
      expect(states[0].id).toBe('agent-1');
      expect(states[0].role).toBe('researcher');
    });
  });

  describe('removeAgent', () => {
    it('should remove agent from pool', async () => {
      const agent = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      await pool.addAgent(agent);

      await pool.removeAgent('agent-1');

      expect(pool.getAgent('agent-1')).toBeUndefined();
    });

    it('should emit agentStopped event', async () => {
      const handler = vi.fn();
      pool.on('agentStopped', handler);

      const agent = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      await pool.addAgent(agent);
      await pool.removeAgent('agent-1');

      expect(handler).toHaveBeenCalledWith('agent-1');
    });

    it('should remove from session tracking', async () => {
      const agent = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      await pool.addAgent(agent);
      await pool.removeAgent('agent-1');

      expect(pool.getSessionAgents('session-1')).toEqual([]);
    });

    it('should handle non-existent agent gracefully', async () => {
      await expect(pool.removeAgent('non-existent')).resolves.not.toThrow();
    });
  });

  describe('removeSessionAgents', () => {
    it('should remove all agents for a session', async () => {
      const agent1 = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      const agent2 = new TestAgent({ id: 'agent-2', sessionId: 'session-1', role: 'synthesizer' });
      const agent3 = new TestAgent({ id: 'agent-3', sessionId: 'session-2', role: 'researcher' });

      await pool.addAgent(agent1);
      await pool.addAgent(agent2);
      await pool.addAgent(agent3);

      await pool.removeSessionAgents('session-1');

      expect(pool.getSessionAgents('session-1')).toEqual([]);
      expect(pool.getSessionAgents('session-2')).toHaveLength(1);
    });

    it('should handle non-existent session gracefully', async () => {
      await expect(pool.removeSessionAgents('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return pool statistics', async () => {
      const agent1 = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      const agent2 = new TestAgent({ id: 'agent-2', sessionId: 'session-1', role: 'synthesizer' });
      const agent3 = new TestAgent({ id: 'agent-3', sessionId: 'session-2', role: 'researcher' });

      await pool.addAgent(agent1);
      await pool.addAgent(agent2);
      await pool.addAgent(agent3);

      const stats = pool.getStats();

      expect(stats.totalAgents).toBe(3);
      expect(stats.agentsBySession['session-1']).toBe(2);
      expect(stats.agentsBySession['session-2']).toBe(1);
      expect(stats.agentsByRole.researcher).toBe(2);
      expect(stats.agentsByRole.synthesizer).toBe(1);
      expect(stats.agentsByRole.orchestrator).toBe(0);
    });

    it('should return empty stats for empty pool', () => {
      const stats = pool.getStats();

      expect(stats.totalAgents).toBe(0);
      expect(stats.agentsBySession).toEqual({});
      expect(stats.agentsByRole).toEqual({
        orchestrator: 0,
        researcher: 0,
        synthesizer: 0,
      });
    });
  });

  describe('clear', () => {
    it('should remove all agents', async () => {
      const agent1 = new TestAgent({ id: 'agent-1', sessionId: 'session-1', role: 'researcher' });
      const agent2 = new TestAgent({ id: 'agent-2', sessionId: 'session-2', role: 'researcher' });

      await pool.addAgent(agent1);
      await pool.addAgent(agent2);
      await pool.clear();

      expect(pool.getStats().totalAgents).toBe(0);
    });
  });

  describe('getAgentPool', () => {
    it('should return singleton instance', () => {
      resetAgentPool();
      const pool1 = getAgentPool();
      const pool2 = getAgentPool();

      expect(pool1).toBe(pool2);
    });

    it('should create new instance after reset', async () => {
      const pool1 = getAgentPool();
      await resetAgentPool();
      const pool2 = getAgentPool();

      expect(pool1).not.toBe(pool2);
    });
  });
});
