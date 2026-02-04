// Research Session Types

import { AgentState } from './agents';

export type SessionStatus =
  | 'planning'
  | 'researching'
  | 'awaiting_feedback'
  | 'synthesizing'
  | 'completed'
  | 'error'
  | 'paused';

export type DepthLevel = 'shallow' | 'medium' | 'deep';

export type ResearchStyle = 'academic' | 'journalistic' | 'technical' | 'general';

export type OutputTone = 'formal' | 'casual' | 'technical';

export interface ResearchConfig {
  maxAgents: number;
  maxSearchesPerAgent: number;
  depthLevel: DepthLevel;
  focusAreas?: string[];
  excludeTopics?: string[];
}

export interface LoopExitCriteria {
  maxIterations: number;
  maxDurationMinutes: number;
  minConfidenceScore: number;
  saturationThreshold: number;
  requiredSubtopicCoverage: number;
}

export interface AgentPromptConfig {
  orchestratorPrompt?: string;
  researcherPrompt?: string;
  synthesizerPrompt?: string;
  orchestratorInstructions?: string;
  researcherInstructions?: string;
  synthesizerInstructions?: string;
  researchStyle?: ResearchStyle;
  outputTone?: OutputTone;
  domainContext?: string;
  priorKnowledge?: string;
  avoidTopics?: string[];
  requiredSources?: string[];
  excludedSources?: string[];
}

export interface ResearchPlan {
  mainTopic: string;
  subtopics: SubtopicPlan[];
  strategy: string;
}

export interface SubtopicPlan {
  id: string;
  title: string;
  description: string;
  searchQueries: string[];
  assignedAgent?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface ResearchSession {
  id: string;
  topic: string;
  status: SessionStatus;
  config: ResearchConfig;
  promptConfig?: AgentPromptConfig;
  exitCriteria: LoopExitCriteria;
  currentIteration: number;
  plan?: ResearchPlan;
  agents: AgentState[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface UserFeedback {
  id: string;
  sessionId: string;
  iteration: number;
  timestamp: Date;
  type: 'guidance' | 'approval' | 'stop' | 'redirect';
  content: string;
  processed: boolean;
  processedAt?: Date;
}

export interface Finding {
  id: string;
  sessionId: string;
  agentId: string;
  iteration: number;
  content: string;
  sources: SourceReference[];
  confidence: number;
  category: string;
  timestamp: Date;
}

export interface SourceReference {
  url: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  reliability?: number;
  accessedAt?: Date;
}

export interface Synthesis {
  id: string;
  sessionId: string;
  iteration: number;
  isFinal: boolean;
  summary: string;
  keyFindings: KeyFinding[];
  sections: SynthesisSection[];
  confidence?: number;
  createdAt: Date;
}

export interface KeyFinding {
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  sources: string[];
}

export interface SynthesisSection {
  title: string;
  content: string;
  sources: string[];
}

// Create session request
export interface CreateSessionRequest {
  topic: string;
  config?: Partial<ResearchConfig>;
  promptConfig?: AgentPromptConfig;
  exitCriteria?: Partial<LoopExitCriteria>;
}

export interface CreateSessionResponse {
  session: ResearchSession;
}
