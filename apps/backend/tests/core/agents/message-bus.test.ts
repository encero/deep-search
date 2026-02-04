import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageBus, getMessageBus, resetMessageBus } from '../../../src/core/agents/message-bus.js';
import { MessageType } from '@deep-search/shared';

describe('MessageBus', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    resetMessageBus();
    messageBus = new MessageBus();
  });

  afterEach(() => {
    messageBus.clear();
    resetMessageBus();
  });

  describe('subscribe', () => {
    it('should subscribe an agent to receive messages', async () => {
      const handler = vi.fn();

      messageBus.subscribe('agent-1', handler);
      await messageBus.send(
        'agent-2',
        'agent-1',
        MessageType.ASSIGN_TASK,
        { task: 'test' },
        'session-1',
        1
      );

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'agent-2',
          to: 'agent-1',
          type: MessageType.ASSIGN_TASK,
          payload: { task: 'test' },
        })
      );
    });

    it('should return unsubscribe function', async () => {
      const handler = vi.fn();

      const unsubscribe = messageBus.subscribe('agent-1', handler);
      unsubscribe();

      await messageBus.send(
        'agent-2',
        'agent-1',
        MessageType.ASSIGN_TASK,
        {},
        'session-1',
        1
      );

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow multiple handlers for same agent', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      messageBus.subscribe('agent-1', handler1);
      messageBus.subscribe('agent-1', handler2);

      await messageBus.send('agent-2', 'agent-1', MessageType.FINDING_REPORT, {}, 'session-1', 1);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeToSession', () => {
    it('should subscribe to all messages in a session', async () => {
      const handler = vi.fn();

      messageBus.subscribeToSession('session-1', handler);

      await messageBus.send('agent-1', 'agent-2', MessageType.FINDING_REPORT, {}, 'session-1', 1);
      await messageBus.send('agent-3', 'agent-4', MessageType.TASK_COMPLETED, {}, 'session-1', 1);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should not receive messages from other sessions', async () => {
      const handler = vi.fn();

      messageBus.subscribeToSession('session-1', handler);

      await messageBus.send('agent-1', 'agent-2', MessageType.FINDING_REPORT, {}, 'session-2', 1);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      const handler = vi.fn();

      const unsubscribe = messageBus.subscribeToSession('session-1', handler);
      unsubscribe();

      await messageBus.send('agent-1', 'agent-2', MessageType.FINDING_REPORT, {}, 'session-1', 1);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should create message with correct structure', async () => {
      const handler = vi.fn();
      messageBus.subscribe('agent-1', handler);

      await messageBus.send(
        'agent-2',
        'agent-1',
        MessageType.ASSIGN_TASK,
        { subtopic: 'test' },
        'session-1',
        5
      );

      const message = handler.mock.calls[0][0];
      expect(message).toHaveProperty('id');
      expect(message.from).toBe('agent-2');
      expect(message.to).toBe('agent-1');
      expect(message.type).toBe(MessageType.ASSIGN_TASK);
      expect(message.payload).toEqual({ subtopic: 'test' });
      expect(message.sessionId).toBe('session-1');
      expect(message.iteration).toBe(5);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should emit global message event', async () => {
      const globalHandler = vi.fn();
      messageBus.on('message', globalHandler);

      await messageBus.send('agent-1', 'agent-2', MessageType.FINDING_REPORT, {}, 'session-1', 1);

      expect(globalHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in handlers gracefully', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = vi.fn();

      messageBus.subscribe('agent-1', errorHandler);
      messageBus.subscribe('agent-1', successHandler);

      await expect(
        messageBus.send('agent-2', 'agent-1', MessageType.ASSIGN_TASK, {}, 'session-1', 1)
      ).resolves.not.toThrow();

      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('should send message to all subscribed agents', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      messageBus.subscribe('agent-1', handler1);
      messageBus.subscribe('agent-2', handler2);
      messageBus.subscribe('agent-3', handler3);

      await messageBus.broadcast(
        'orchestrator',
        MessageType.STOP_RESEARCH,
        {},
        'session-1',
        1
      );

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should exclude specified agents from broadcast', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      messageBus.subscribe('agent-1', handler1);
      messageBus.subscribe('agent-2', handler2);

      await messageBus.broadcast(
        'orchestrator',
        MessageType.STOP_RESEARCH,
        {},
        'session-1',
        1,
        ['agent-1']
      );

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should set "to" field as wildcard', async () => {
      const handler = vi.fn();
      messageBus.subscribeToSession('session-1', handler);

      await messageBus.broadcast('orchestrator', MessageType.STOP_RESEARCH, {}, 'session-1', 1);

      expect(handler.mock.calls[0][0].to).toBe('*');
    });

    it('should emit broadcast event', async () => {
      const broadcastHandler = vi.fn();
      messageBus.on('broadcast', broadcastHandler);

      await messageBus.broadcast('orchestrator', MessageType.STOP_RESEARCH, {}, 'session-1', 1);

      expect(broadcastHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribeAgent', () => {
    it('should remove all handlers for an agent', async () => {
      const handler = vi.fn();
      messageBus.subscribe('agent-1', handler);

      messageBus.unsubscribeAgent('agent-1');

      await messageBus.send('agent-2', 'agent-1', MessageType.ASSIGN_TASK, {}, 'session-1', 1);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeSession', () => {
    it('should remove all session handlers', async () => {
      const handler = vi.fn();
      messageBus.subscribeToSession('session-1', handler);

      messageBus.unsubscribeSession('session-1');

      await messageBus.send('agent-1', 'agent-2', MessageType.FINDING_REPORT, {}, 'session-1', 1);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all handlers', async () => {
      const agentHandler = vi.fn();
      const sessionHandler = vi.fn();

      messageBus.subscribe('agent-1', agentHandler);
      messageBus.subscribeToSession('session-1', sessionHandler);

      messageBus.clear();

      await messageBus.send('agent-2', 'agent-1', MessageType.ASSIGN_TASK, {}, 'session-1', 1);

      expect(agentHandler).not.toHaveBeenCalled();
      expect(sessionHandler).not.toHaveBeenCalled();
    });
  });

  describe('getMessageBus', () => {
    it('should return singleton instance', () => {
      const bus1 = getMessageBus();
      const bus2 = getMessageBus();

      expect(bus1).toBe(bus2);
    });

    it('should create new instance after reset', () => {
      const bus1 = getMessageBus();
      resetMessageBus();
      const bus2 = getMessageBus();

      expect(bus1).not.toBe(bus2);
    });
  });
});
