// Inter-Agent Message Types

export enum MessageType {
  // Orchestrator -> Researcher
  ASSIGN_TASK = 'assign_task',
  REQUEST_CLARIFICATION = 'request_clarification',
  EXPAND_RESEARCH = 'expand_research',
  STOP_RESEARCH = 'stop_research',

  // Researcher -> Orchestrator
  FINDING_REPORT = 'finding_report',
  TASK_COMPLETED = 'task_completed',
  CLARIFICATION_RESPONSE = 'clarification_response',

  // Orchestrator -> Synthesizer
  SYNTHESIZE_REQUEST = 'synthesize_request',

  // Synthesizer -> Orchestrator
  SYNTHESIS_COMPLETE = 'synthesis_complete',

  // User Feedback (via Orchestrator)
  USER_FEEDBACK = 'user_feedback',
  USER_STOP_REQUEST = 'user_stop_request',
}

export interface AgentMessage<T = unknown> {
  id: string;
  sessionId: string;
  iteration: number;
  from: string;
  to: string;
  type: MessageType;
  payload: T;
  timestamp: Date;
}

export interface AssignTaskPayload {
  subtopic: string;
  searchQueries: string[];
  instructions?: string;
}

export interface FindingReportPayload {
  findings: {
    content: string;
    sources: {
      url: string;
      title: string;
      snippet: string;
      relevanceScore: number;
    }[];
    confidence: number;
    category: string;
  }[];
}

export interface SynthesizeRequestPayload {
  iteration: number;
  isFinal: boolean;
  knowledgeEntryIds: string[];
}

export interface SynthesisCompletePayload {
  synthesisId: string;
  summary: string;
  keyFindings: {
    title: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    sources: string[];
  }[];
}

export interface UserFeedbackPayload {
  type: 'guidance' | 'approval' | 'stop' | 'redirect';
  content: string;
}
