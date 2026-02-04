import { EventEmitter } from 'events';
import type { AgentMessage, MessageType } from '@deep-search/shared';
import { generateId } from '@deep-search/shared';

type MessageHandler<T = unknown> = (message: AgentMessage<T>) => void | Promise<void>;

export class MessageBus extends EventEmitter {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private sessionHandlers: Map<string, Set<MessageHandler>> = new Map();

  // Subscribe to messages for a specific agent
  subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, new Set());
    }
    this.handlers.get(agentId)!.add(handler);

    return () => {
      this.handlers.get(agentId)?.delete(handler);
    };
  }

  // Subscribe to all messages in a session
  subscribeToSession(sessionId: string, handler: MessageHandler): () => void {
    if (!this.sessionHandlers.has(sessionId)) {
      this.sessionHandlers.set(sessionId, new Set());
    }
    this.sessionHandlers.get(sessionId)!.add(handler);

    return () => {
      this.sessionHandlers.get(sessionId)?.delete(handler);
    };
  }

  // Send a message to a specific agent
  async send<T>(
    from: string,
    to: string,
    type: MessageType,
    payload: T,
    sessionId: string,
    iteration: number
  ): Promise<void> {
    const message: AgentMessage<T> = {
      id: generateId(),
      sessionId,
      iteration,
      from,
      to,
      type,
      payload,
      timestamp: new Date(),
    };

    // Emit to global listeners
    this.emit('message', message);

    // Emit to session listeners
    const sessionListeners = this.sessionHandlers.get(sessionId);
    if (sessionListeners) {
      for (const handler of sessionListeners) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error in session handler for ${sessionId}:`, error);
        }
      }
    }

    // Emit to agent-specific listeners
    const agentListeners = this.handlers.get(to);
    if (agentListeners) {
      for (const handler of agentListeners) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error in agent handler for ${to}:`, error);
        }
      }
    }
  }

  // Broadcast to all agents in a session
  async broadcast<T>(
    from: string,
    type: MessageType,
    payload: T,
    sessionId: string,
    iteration: number,
    excludeAgents: string[] = []
  ): Promise<void> {
    const message: AgentMessage<T> = {
      id: generateId(),
      sessionId,
      iteration,
      from,
      to: '*',
      type,
      payload,
      timestamp: new Date(),
    };

    this.emit('broadcast', message);

    // Notify session handlers
    const sessionListeners = this.sessionHandlers.get(sessionId);
    if (sessionListeners) {
      for (const handler of sessionListeners) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error in session broadcast handler:`, error);
        }
      }
    }

    // Notify all agent handlers except excluded ones
    for (const [agentId, handlers] of this.handlers) {
      if (!excludeAgents.includes(agentId)) {
        for (const handler of handlers) {
          try {
            await handler(message);
          } catch (error) {
            console.error(`Error in agent broadcast handler for ${agentId}:`, error);
          }
        }
      }
    }
  }

  // Remove all handlers for an agent
  unsubscribeAgent(agentId: string): void {
    this.handlers.delete(agentId);
  }

  // Remove all handlers for a session
  unsubscribeSession(sessionId: string): void {
    this.sessionHandlers.delete(sessionId);
  }

  // Clear all handlers
  clear(): void {
    this.handlers.clear();
    this.sessionHandlers.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
let messageBusInstance: MessageBus | null = null;

export function getMessageBus(): MessageBus {
  if (!messageBusInstance) {
    messageBusInstance = new MessageBus();
  }
  return messageBusInstance;
}

export function resetMessageBus(): void {
  if (messageBusInstance) {
    messageBusInstance.clear();
    messageBusInstance = null;
  }
}
