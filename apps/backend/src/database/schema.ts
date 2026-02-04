import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Research Sessions
export const researchSessions = sqliteTable('research_sessions', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  status: text('status').notNull().$type<
    'planning' | 'researching' | 'awaiting_feedback' | 'synthesizing' | 'completed' | 'error' | 'paused'
  >(),
  currentIteration: integer('current_iteration').default(0),
  config: text('config', { mode: 'json' }).notNull().$type<{
    maxAgents: number;
    maxSearchesPerAgent: number;
    depthLevel: 'shallow' | 'medium' | 'deep';
    focusAreas?: string[];
    excludeTopics?: string[];
  }>(),
  promptConfig: text('prompt_config', { mode: 'json' }).$type<{
    orchestratorPrompt?: string;
    researcherPrompt?: string;
    synthesizerPrompt?: string;
    orchestratorInstructions?: string;
    researcherInstructions?: string;
    synthesizerInstructions?: string;
    researchStyle?: string;
    outputTone?: string;
    domainContext?: string;
    priorKnowledge?: string;
    avoidTopics?: string[];
    requiredSources?: string[];
    excludedSources?: string[];
  }>(),
  exitCriteria: text('exit_criteria', { mode: 'json' }).$type<{
    maxIterations: number;
    maxDurationMinutes: number;
    minConfidenceScore: number;
    saturationThreshold: number;
    requiredSubtopicCoverage: number;
  }>(),
  plan: text('plan', { mode: 'json' }).$type<{
    mainTopic: string;
    subtopics: Array<{
      id: string;
      title: string;
      description: string;
      searchQueries: string[];
      assignedAgent?: string;
      status?: string;
    }>;
    strategy: string;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Agents
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  role: text('role').notNull().$type<'orchestrator' | 'researcher' | 'synthesizer'>(),
  status: text('status').notNull().$type<
    'idle' | 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'waiting' | 'completed' | 'error'
  >(),
  assignedSubtopic: text('assigned_subtopic'),
  customPrompt: text('custom_prompt'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Knowledge Entries
export const knowledgeEntries = sqliteTable('knowledge_entries', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  agentId: text('agent_id').references(() => agents.id),
  iteration: integer('iteration').notNull(),

  // Content
  content: text('content').notNull(),
  summary: text('summary'),
  category: text('category'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),

  // Quality metrics
  confidence: real('confidence'),
  relevance: real('relevance'),
  novelty: real('novelty'),

  // Relationships
  relatedEntries: text('related_entries', { mode: 'json' }).$type<string[]>(),
  contradicts: text('contradicts', { mode: 'json' }).$type<string[]>(),
  supports: text('supports', { mode: 'json' }).$type<string[]>(),

  // Versioning
  version: integer('version').default(1),
  previousVersionId: text('previous_version_id'),
  mergedFrom: text('merged_from', { mode: 'json' }).$type<string[]>(),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Sources
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').references(() => knowledgeEntries.id),
  url: text('url').notNull(),
  title: text('title'),
  excerpt: text('excerpt'),
  fullContent: text('full_content'),
  reliability: real('reliability'),
  accessedAt: integer('accessed_at', { mode: 'timestamp' }),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
});

// Syntheses
export const syntheses = sqliteTable('syntheses', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  iteration: integer('iteration'),
  isFinal: integer('is_final', { mode: 'boolean' }).default(false),
  summary: text('summary').notNull(),
  keyFindings: text('key_findings', { mode: 'json' }).notNull().$type<Array<{
    title: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    sources: string[];
  }>>(),
  sections: text('sections', { mode: 'json' }).notNull().$type<Array<{
    title: string;
    content: string;
    sources: string[];
  }>>(),
  confidence: real('confidence'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// User Feedback
export const userFeedback = sqliteTable('user_feedback', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  iteration: integer('iteration').notNull(),
  type: text('type').notNull().$type<'guidance' | 'approval' | 'stop' | 'redirect'>(),
  content: text('content').notNull(),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Knowledge Gaps
export const knowledgeGaps = sqliteTable('knowledge_gaps', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  iteration: integer('iteration').notNull(),
  subtopic: text('subtopic'),
  description: text('description').notNull(),
  priority: text('priority').$type<'high' | 'medium' | 'low'>(),
  suggestedQueries: text('suggested_queries', { mode: 'json' }).$type<string[]>(),
  resolved: integer('resolved', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Agent Messages (for debugging/audit)
export const agentMessages = sqliteTable('agent_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  iteration: integer('iteration'),
  fromAgent: text('from_agent'),
  toAgent: text('to_agent'),
  type: text('type').notNull(),
  payload: text('payload', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Saved Prompts
export const savedPrompts = sqliteTable('saved_prompts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  agentType: text('agent_type').notNull().$type<'orchestrator' | 'researcher' | 'synthesizer'>(),
  promptText: text('prompt_text').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
