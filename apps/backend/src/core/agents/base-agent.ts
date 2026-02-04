import type {
  AgentConfig,
  AgentMessage,
  AgentRole,
  AgentState,
  AgentStatus,
  MessageType,
} from '@deep-search/shared';
import { generateId } from '@deep-search/shared';
import { getMessageBus, type MessageBus } from './message-bus.js';
import { EventEmitter } from 'events';

export interface AgentEvents {
  statusChange: (status: AgentStatus, previousStatus: AgentStatus) => void;
  progress: (progress: number, task?: string) => void;
  error: (error: Error) => void;
  complete: () => void;
}

export abstract class BaseAgent extends EventEmitter {
  readonly id: string;
  readonly role: AgentRole;
  readonly sessionId: string;
  protected customPrompt?: string;
  protected assignedSubtopic?: string;

  protected status: AgentStatus = 'idle';
  protected progress = 0;
  protected currentTask?: string;
  protected error?: string;
  protected startedAt?: Date;
  protected completedAt?: Date;

  protected messageBus: MessageBus;
  private unsubscribe?: () => void;

  constructor(config: AgentConfig) {
    super();
    this.id = config.id || generateId();
    this.role = config.role;
    this.sessionId = config.sessionId;
    this.customPrompt = config.customPrompt;
    this.assignedSubtopic = config.assignedSubtopic;
    this.messageBus = getMessageBus();
  }

  // Abstract methods that must be implemented by subclasses
  abstract run(): Promise<void>;
  abstract handleMessage(message: AgentMessage): Promise<void>;

  // Start the agent and subscribe to messages
  async start(): Promise<void> {
    this.startedAt = new Date();
    this.unsubscribe = this.messageBus.subscribe(this.id, (message) =>
      this.handleMessage(message)
    );
    this.updateStatus('idle');
  }

  // Stop the agent and unsubscribe from messages
  async stop(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.completedAt = new Date();
    this.updateStatus('completed');
    this.emit('complete');
  }

  // Get current agent state
  getState(): AgentState {
    return {
      id: this.id,
      sessionId: this.sessionId,
      role: this.role,
      status: this.status,
      assignedSubtopic: this.assignedSubtopic,
      customPrompt: this.customPrompt,
      progress: this.progress,
      currentTask: this.currentTask,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
    };
  }

  // Protected methods for subclasses

  protected updateStatus(status: AgentStatus): void {
    const previousStatus = this.status;
    this.status = status;
    this.emit('statusChange', status, previousStatus);
  }

  protected updateProgress(progress: number, task?: string): void {
    this.progress = Math.max(0, Math.min(100, progress));
    this.currentTask = task;
    this.emit('progress', this.progress, task);
  }

  protected setError(error: Error): void {
    this.error = error.message;
    this.updateStatus('error');
    this.emit('error', error);
  }

  protected async sendMessage<T>(
    to: string,
    type: MessageType,
    payload: T,
    iteration: number
  ): Promise<void> {
    await this.messageBus.send(this.id, to, type, payload, this.sessionId, iteration);
  }

  protected async broadcast<T>(
    type: MessageType,
    payload: T,
    iteration: number,
    excludeAgents: string[] = []
  ): Promise<void> {
    await this.messageBus.broadcast(
      this.id,
      type,
      payload,
      this.sessionId,
      iteration,
      excludeAgents
    );
  }
}
