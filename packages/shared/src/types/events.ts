// WebSocket Event Types

import { AgentState } from './agents';
import { ResearchPlan, Synthesis, SessionStatus, KeyFinding } from './research';
import { KnowledgeEntry, KnowledgeGap } from './knowledge';

// Client -> Server events
export type ClientEventType =
  | 'join_session'
  | 'leave_session'
  | 'send_feedback'
  | 'request_finish';

export interface JoinSessionEvent {
  type: 'join_session';
  sessionId: string;
}

export interface LeaveSessionEvent {
  type: 'leave_session';
  sessionId: string;
}

export interface SendFeedbackEvent {
  type: 'send_feedback';
  sessionId: string;
  feedbackType: 'guidance' | 'approval' | 'stop' | 'redirect';
  content: string;
}

export interface RequestFinishEvent {
  type: 'request_finish';
  sessionId: string;
}

export type ClientEvent =
  | JoinSessionEvent
  | LeaveSessionEvent
  | SendFeedbackEvent
  | RequestFinishEvent;

// Server -> Client events
export type ServerEventType =
  | 'session_status'
  | 'iteration_started'
  | 'iteration_complete'
  | 'plan_created'
  | 'plan_updated'
  | 'agent_spawned'
  | 'agent_status'
  | 'agent_progress'
  | 'finding_added'
  | 'knowledge_updated'
  | 'synthesis_started'
  | 'synthesis_chunk'
  | 'synthesis_complete'
  | 'feedback_processed'
  | 'research_complete'
  | 'error';

export interface SessionStatusEvent {
  type: 'session_status';
  sessionId: string;
  status: SessionStatus;
  iteration: number;
}

export interface IterationStartedEvent {
  type: 'iteration_started';
  sessionId: string;
  iteration: number;
}

export interface IterationCompleteEvent {
  type: 'iteration_complete';
  sessionId: string;
  iteration: number;
  findingsCount: number;
}

export interface PlanCreatedEvent {
  type: 'plan_created';
  sessionId: string;
  plan: ResearchPlan;
}

export interface PlanUpdatedEvent {
  type: 'plan_updated';
  sessionId: string;
  plan: ResearchPlan;
  reason: string;
}

export interface AgentSpawnedEvent {
  type: 'agent_spawned';
  sessionId: string;
  agent: AgentState;
}

export interface AgentStatusEvent {
  type: 'agent_status';
  sessionId: string;
  agentId: string;
  status: AgentState['status'];
  currentTask?: string;
  error?: string;
}

export interface AgentProgressEvent {
  type: 'agent_progress';
  sessionId: string;
  agentId: string;
  progress: number;
  currentTask?: string;
}

export interface FindingAddedEvent {
  type: 'finding_added';
  sessionId: string;
  agentId: string;
  entry: KnowledgeEntry;
}

export interface KnowledgeUpdatedEvent {
  type: 'knowledge_updated';
  sessionId: string;
  totalEntries: number;
  coverage: number;
  gaps: KnowledgeGap[];
}

export interface SynthesisStartedEvent {
  type: 'synthesis_started';
  sessionId: string;
  iteration: number;
  isFinal: boolean;
}

export interface SynthesisChunkEvent {
  type: 'synthesis_chunk';
  sessionId: string;
  content: string;
  section?: string;
}

export interface SynthesisCompleteEvent {
  type: 'synthesis_complete';
  sessionId: string;
  synthesis: Synthesis;
}

export interface FeedbackProcessedEvent {
  type: 'feedback_processed';
  sessionId: string;
  feedbackId: string;
  action: string;
}

export interface ResearchCompleteEvent {
  type: 'research_complete';
  sessionId: string;
  synthesis: Synthesis;
  totalIterations: number;
  totalSources: number;
}

export interface ErrorEvent {
  type: 'error';
  sessionId: string;
  error: string;
  code?: string;
}

export type ServerEvent =
  | SessionStatusEvent
  | IterationStartedEvent
  | IterationCompleteEvent
  | PlanCreatedEvent
  | PlanUpdatedEvent
  | AgentSpawnedEvent
  | AgentStatusEvent
  | AgentProgressEvent
  | FindingAddedEvent
  | KnowledgeUpdatedEvent
  | SynthesisStartedEvent
  | SynthesisChunkEvent
  | SynthesisCompleteEvent
  | FeedbackProcessedEvent
  | ResearchCompleteEvent
  | ErrorEvent;
