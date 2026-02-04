// Knowledge Storage Types

export interface KnowledgeEntry {
  id: string;
  sessionId: string;
  agentId: string;
  iteration: number;

  // Content
  content: string;
  summary: string;
  category: string;
  tags: string[];

  // Quality metrics
  confidence: number;
  relevance: number;
  novelty: number;

  // Relationships
  relatedEntries: string[];
  contradicts: string[];
  supports: string[];

  // Versioning
  version: number;
  previousVersionId?: string;
  mergedFrom?: string[];

  createdAt: Date;
}

export interface SourceRecord {
  id: string;
  entryId: string;
  url: string;
  title: string;
  excerpt: string;
  fullContent?: string;
  reliability: number;
  accessedAt: Date;
  publishedAt?: Date;
}

export interface SearchLogEntry {
  id: string;
  agentId: string;
  query: string;
  resultsCount: number;
  timestamp: Date;
}

export interface ReasoningStep {
  id: string;
  agentId: string;
  step: string;
  reasoning: string;
  timestamp: Date;
}

export interface AgentKnowledge {
  agentId: string;
  sessionId: string;
  assignedSubtopic: string;
  entries: KnowledgeEntry[];
  searchHistory: SearchLogEntry[];
  reasoningLog: ReasoningStep[];
  stats: {
    totalSearches: number;
    totalSources: number;
    totalFindings: number;
    avgConfidence: number;
  };
}

export interface Theme {
  id: string;
  title: string;
  description: string;
  supportingEntries: string[];
  strength: number;
}

export interface Contradiction {
  id: string;
  description: string;
  entries: string[];
  resolved: boolean;
  resolution?: string;
}

export interface KnowledgeGap {
  id: string;
  sessionId: string;
  iteration: number;
  subtopic: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedQueries: string[];
  resolved: boolean;
  createdAt: Date;
}

export interface CombinedKnowledge {
  sessionId: string;
  iteration: number;
  entries: KnowledgeEntry[];
  keyThemes: Theme[];
  contradictions: Contradiction[];
  gaps: KnowledgeGap[];
  overallConfidence: number;
  coverageBySubtopic: Record<string, number>;
  updatedAt: Date;
}

export interface KnowledgeFilters {
  sessionId?: string;
  agentId?: string;
  category?: string;
  minConfidence?: number;
  tags?: string[];
  iteration?: number;
}
