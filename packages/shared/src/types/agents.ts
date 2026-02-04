// Agent System Types

export type AgentRole = 'orchestrator' | 'researcher' | 'synthesizer';

export type AgentStatus =
  | 'idle'
  | 'planning'
  | 'searching'
  | 'analyzing'
  | 'synthesizing'
  | 'waiting'
  | 'completed'
  | 'error';

export interface AgentState {
  id: string;
  sessionId: string;
  role: AgentRole;
  status: AgentStatus;
  assignedSubtopic?: string;
  customPrompt?: string;
  progress?: number;
  currentTask?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface AgentConfig {
  id: string;
  role: AgentRole;
  sessionId: string;
  customPrompt?: string;
  assignedSubtopic?: string;
}
