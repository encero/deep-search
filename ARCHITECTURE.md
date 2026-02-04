# Deep Research LLM Application - Architecture

A modular, self-contained LLM application for deep research built with TanStack Start.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (full-stack React) |
| Routing | TanStack Router (file-based) |
| Data Fetching | TanStack Query + tRPC |
| AI Integration | TanStack AI (multi-provider) |
| State Management | TanStack Store |
| Database | Drizzle ORM + SQLite (local) / PostgreSQL (self-hosted) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Real-time | Server-Sent Events (SSE) |
| LLM Provider | Anthropic / OpenAI / Ollama / OpenRouter |
| Web Search | SearXNG (self-hosted) / Built-in scraper (Playwright) |

**Note:** No external APIs required except for optional cloud LLM providers. All search functionality is self-hosted.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TANSTACK START APPLICATION                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                              ROUTES (UI)                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Research Input  │  Agent Status Panel  │  Synthesis Results   │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  TanStack Query (cache) ◄──► tRPC Client ◄──► SSE EventSource        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         SERVER LAYER (Nitro)                           │ │
│  │                                                                        │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │ │
│  │  │  Server Funcs    │  │  tRPC Router     │  │  API Routes        │  │ │
│  │  │  (mutations)     │  │  (type-safe RPC) │  │  (SSE streaming)   │  │ │
│  │  └──────────────────┘  └──────────────────┘  └────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      AGENT ORCHESTRATION                               │ │
│  │                                                                        │ │
│  │                    ┌─────────────────────┐                             │ │
│  │                    │  Orchestrator Agent │                             │ │
│  │                    │  (Master Controller)│                             │ │
│  │                    └──────────┬──────────┘                             │ │
│  │                               │                                        │ │
│  │          ┌────────────────────┼────────────────────┐                   │ │
│  │          ▼                    ▼                    ▼                   │ │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │ │
│  │  │  Researcher  │    │  Researcher  │    │  Researcher  │             │ │
│  │  │  Agent 1     │    │  Agent 2     │    │  Agent N     │             │ │
│  │  └──────────────┘    └──────────────┘    └──────────────┘             │ │
│  │          │                    │                    │                   │ │
│  │          └────────────────────┼────────────────────┘                   │ │
│  │                               ▼                                        │ │
│  │                    ┌─────────────────────┐                             │ │
│  │                    │  Synthesizer Agent  │                             │ │
│  │                    └─────────────────────┘                             │ │
│  │                                                                        │ │
│  │                       Event Emitter (In-process)                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
          ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
          │   LLM Provider  │ │ Web Search  │ │   Database      │
          │   (TanStack AI) │ │ (self-host) │ │   (Drizzle)     │
          │                 │ │             │ │                 │
          │ • Anthropic     │ │ • SearXNG   │ │ • SQLite (local)│
          │ • OpenAI        │ │ • Playwright│ │ • PostgreSQL    │
          │ • Ollama        │ │   scraper   │ │                 │
          │ • OpenRouter    │ │             │ │                 │
          └─────────────────┘ └─────────────┘ └─────────────────┘
```

---

## Folder Structure

```
deep-search/
├── src/
│   ├── routes/                          # File-based routing (TanStack Router)
│   │   ├── __root.tsx                   # Root layout with providers
│   │   ├── index.tsx                    # Home page
│   │   │
│   │   ├── research/                    # Deep research module routes
│   │   │   ├── index.tsx                # Research list / new research
│   │   │   ├── $sessionId.tsx           # Active research session view
│   │   │   └── $sessionId.results.tsx   # Final results view
│   │   │
│   │   ├── settings/
│   │   │   └── index.tsx                # App settings page
│   │   │
│   │   └── api/                         # API route handlers
│   │       ├── trpc.$.ts                # tRPC catch-all handler
│   │       │
│   │       └── research/                # Research API endpoints
│   │           ├── sessions.ts          # POST: create session
│   │           ├── sessions.$id.ts      # GET/DELETE session
│   │           ├── sessions.$id.stream.ts   # GET: SSE event stream
│   │           ├── sessions.$id.feedback.ts # POST: user feedback
│   │           └── sessions.$id.finish.ts   # POST: finish research
│   │
│   ├── server/                          # Server-only code
│   │   ├── agents/                      # Agent system
│   │   │   ├── base-agent.ts            # Abstract base agent class
│   │   │   ├── orchestrator.ts          # Orchestrator agent
│   │   │   ├── researcher.ts            # Researcher agent
│   │   │   ├── synthesizer.ts           # Synthesizer agent
│   │   │   ├── agent-pool.ts            # Agent lifecycle management
│   │   │   └── event-bus.ts             # In-process event emitter
│   │   │
│   │   ├── services/                    # Business logic
│   │   │   ├── session-manager.ts       # Session lifecycle
│   │   │   ├── research-planner.ts      # Research planning
│   │   │   └── knowledge-store.ts       # Knowledge aggregation
│   │   │
│   │   ├── providers/                   # External service adapters
│   │   │   ├── llm/
│   │   │   │   ├── index.ts             # LLM provider factory
│   │   │   │   └── adapter.ts           # Uses TanStack AI adapters
│   │   │   │
│   │   │   └── search/
│   │   │       ├── index.ts             # Search provider factory
│   │   │       ├── searxng.ts           # SearXNG integration
│   │   │       └── scraper.ts           # Playwright scraper
│   │   │
│   │   ├── prompts/                     # Agent system prompts
│   │   │   ├── orchestrator.ts
│   │   │   ├── researcher.ts
│   │   │   └── synthesizer.ts
│   │   │
│   │   └── functions/                   # Server functions (createServerFn)
│   │       ├── sessions.ts              # Session CRUD operations
│   │       ├── feedback.ts              # User feedback handling
│   │       └── settings.ts              # Settings management
│   │
│   ├── integrations/
│   │   └── trpc/                        # tRPC setup
│   │       ├── init.ts                  # tRPC initialization
│   │       ├── router.ts                # Combined router
│   │       ├── routers/
│   │       │   ├── sessions.ts          # Session procedures
│   │       │   ├── knowledge.ts         # Knowledge queries
│   │       │   └── settings.ts          # Settings procedures
│   │       └── react.ts                 # React client setup
│   │
│   ├── modules/
│   │   └── research/                    # Research module UI
│   │       ├── components/
│   │       │   ├── TopicInput.tsx
│   │       │   ├── AgentStatusPanel.tsx
│   │       │   ├── AgentCard.tsx
│   │       │   ├── ResearchTimeline.tsx
│   │       │   ├── SynthesisView.tsx
│   │       │   ├── FeedbackBar.tsx
│   │       │   └── ResultsExport.tsx
│   │       │
│   │       ├── hooks/
│   │       │   ├── useResearchSession.ts    # Session state & SSE
│   │       │   ├── useAgentStatus.ts        # Agent status from SSE
│   │       │   └── useSynthesis.ts          # Synthesis streaming
│   │       │
│   │       └── stores/
│   │           └── research-store.ts        # TanStack Store for UI state
│   │
│   ├── components/
│   │   ├── ui/                          # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── toast.tsx
│   │   │
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── PageContainer.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts                     # General utilities
│   │   ├── sse-client.ts                # SSE EventSource wrapper
│   │   └── export.ts                    # Export helpers (MD, PDF)
│   │
│   ├── types/                           # Shared TypeScript types
│   │   ├── agents.ts
│   │   ├── research.ts
│   │   ├── messages.ts
│   │   ├── knowledge.ts
│   │   └── events.ts
│   │
│   ├── db/
│   │   ├── index.ts                     # Drizzle client
│   │   ├── schema.ts                    # Database schema
│   │   └── migrations/                  # Drizzle migrations
│   │
│   ├── env.ts                           # T3Env configuration
│   ├── router.tsx                       # Router configuration
│   └── root-provider.tsx                # Root providers (Query, tRPC)
│
├── drizzle.config.ts
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Core Abstractions

### LLM Provider (via TanStack AI)

```typescript
// src/server/providers/llm/adapter.ts
import { anthropic } from '@anthropic-ai/sdk';
import { createOpenAI } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';

export function getLLMAdapter() {
  // Uses existing TanStack AI adapter pattern from project
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic('claude-sonnet-4-20250514');
  }
  if (process.env.OPENAI_API_KEY) {
    return createOpenAI()('gpt-4o');
  }
  if (process.env.OLLAMA_BASE_URL) {
    return createOllama({ baseURL: process.env.OLLAMA_BASE_URL })('llama3.2');
  }
  throw new Error('No LLM provider configured');
}

// Usage in agents - leverages TanStack AI streamText
import { streamText } from 'ai';

const stream = await streamText({
  model: getLLMAdapter(),
  system: ORCHESTRATOR_SYSTEM_PROMPT,
  messages: conversationHistory,
  tools: orchestratorTools,
});
```

### Web Search Provider Interface

```typescript
// src/server/providers/search/index.ts
interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  fetchPage(url: string): Promise<PageContent>;
}

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  relevanceScore?: number;
}

interface PageContent {
  url: string;
  title: string;
  content: string;        // Cleaned text
  markdown: string;       // Markdown formatted
  links: string[];        // Outbound links
  metadata: {
    author?: string;
    publishedDate?: string;
    description?: string;
  };
}

// Factory function
export function getSearchProvider(): SearchProvider {
  if (process.env.SEARXNG_URL) {
    return new SearXNGProvider(process.env.SEARXNG_URL);
  }
  return new PlaywrightScraper();
}
```

### Agent Interface

```typescript
// src/server/agents/base-agent.ts
import { EventEmitter } from 'events';

export abstract class BaseAgent {
  protected id: string;
  protected sessionId: string;
  protected eventBus: EventEmitter;

  abstract run(): Promise<void>;
  abstract handleMessage(message: AgentMessage): Promise<void>;

  protected emit(event: AgentEvent): void {
    this.eventBus.emit('agent:event', {
      agentId: this.id,
      sessionId: this.sessionId,
      ...event,
    });
  }

  protected updateStatus(status: AgentStatus): void {
    this.emit({ type: 'status_update', status });
  }
}
```

---

## Server Functions & tRPC

### Server Functions (Mutations)

```typescript
// src/server/functions/sessions.ts
import { createServerFn } from '@tanstack/react-start/server';
import { z } from 'zod';

export const createSession = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      topic: z.string().min(1),
      config: ResearchConfigSchema.optional(),
      promptConfig: AgentPromptConfigSchema.optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await sessionManager.create(data);
    // Start research in background (non-blocking)
    orchestrator.start(session.id);
    return session;
  });

export const submitFeedback = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      sessionId: z.string(),
      type: z.enum(['guidance', 'approval', 'stop', 'redirect']),
      content: z.string(),
    })
  )
  .handler(async ({ data }) => {
    return feedbackService.process(data);
  });
```

### tRPC Router (Queries)

```typescript
// src/integrations/trpc/routers/sessions.ts
import { router, publicProcedure } from '../init';
import { z } from 'zod';

export const sessionsRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(researchSessions).orderBy(desc(createdAt));
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.query.researchSessions.findFirst({
        where: eq(researchSessions.id, input.id),
        with: { agents: true, syntheses: true },
      });
    }),

  getKnowledge: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return knowledgeStore.getCombined(input.sessionId);
    }),
});
```

---

## Real-time with Server-Sent Events

### SSE Endpoint

```typescript
// src/routes/api/research/sessions.$id.stream.ts
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { eventBus } from '~/server/agents/event-bus';

export const Route = createAPIFileRoute('/api/research/sessions/$id/stream')({
  GET: async ({ request, params }) => {
    const { id: sessionId } = params;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: AgentEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        // Subscribe to session events
        const handler = (event: AgentEvent) => {
          if (event.sessionId === sessionId) {
            sendEvent(event);
          }
        };

        eventBus.on('agent:event', handler);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          eventBus.off('agent:event', handler);
          controller.close();
        });

        // Send initial connection event
        sendEvent({ type: 'connected', sessionId });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  },
});
```

### SSE Client Hook

```typescript
// src/modules/research/hooks/useResearchSession.ts
import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '~/integrations/trpc/react';

export function useResearchSession(sessionId: string) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [synthesis, setSynthesis] = useState<string>('');

  // Initial data from tRPC
  const { data: session } = trpc.sessions.get.useQuery({ id: sessionId });

  // SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/research/sessions/${sessionId}/stream`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as AgentEvent;

      switch (data.type) {
        case 'status_update':
          setStatus(data.status);
          break;
        case 'agent_status':
          setAgents((prev) =>
            prev.map((a) => (a.id === data.agentId ? { ...a, ...data } : a))
          );
          break;
        case 'agent_spawned':
          setAgents((prev) => [...prev, data.agent]);
          break;
        case 'synthesis_chunk':
          setSynthesis((prev) => prev + data.chunk);
          break;
        case 'finding_added':
          // Invalidate knowledge query to refetch
          queryClient.invalidateQueries({
            queryKey: ['sessions', sessionId, 'knowledge'],
          });
          break;
        case 'research_complete':
          setStatus('completed');
          queryClient.invalidateQueries({
            queryKey: ['sessions', sessionId],
          });
          break;
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
    };

    return () => eventSource.close();
  }, [sessionId, queryClient]);

  return { session, status, agents, synthesis };
}
```

---

## Agent System Design

### Research Loop (Iterative with User Feedback)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESEARCH LOOP                                      │
│                                                                              │
│   ┌─────────────┐                                                           │
│   │ User Input  │ ─── Topic + Config + Optional Custom Prompts              │
│   └──────┬──────┘                                                           │
│          │                                                                   │
│          ▼                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    ORCHESTRATOR AGENT                                │   │
│   │  ┌───────────────────────────────────────────────────────────────┐  │   │
│   │  │ 1. Plan Research (initial or revised based on feedback)       │  │   │
│   │  │ 2. Spawn/reassign Researcher Agents                           │  │   │
│   │  │ 3. Monitor progress and collect findings                      │  │   │
│   │  │ 4. Store findings in Knowledge Storage                        │  │   │
│   │  │ 5. Evaluate: Is research sufficient?                          │  │   │
│   │  │    ├─ NO  → Request clarification/expansion from agents       │  │   │
│   │  │    ├─ NO  → Spawn new agents for unexplored areas             │  │   │
│   │  │    └─ YES → Trigger synthesis and present to user             │  │   │
│   │  └───────────────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│          │                              ▲                                    │
│          │                              │                                    │
│          ▼                              │ User Feedback (optional)           │
│   ┌─────────────┐                       │  • "Go deeper on X"               │
│   │  Synthesis  │ ──────────────────────┤  • "Ignore Y"                     │
│   │  Presented  │                       │  • "Also look at Z"               │
│   └──────┬──────┘                       │  • "This is good, finish"         │
│          │                              │                                    │
│          ▼                              │                                    │
│   ┌─────────────────────┐               │                                    │
│   │ Orchestrator        │───────────────┘                                    │
│   │ Decision Point      │                                                    │
│   │                     │                                                    │
│   │ • Continue loop?    │──── YES ────→ Loop continues                      │
│   │ • Exit criteria met?│                                                    │
│   │ • User said stop?   │──── NO  ────→ Final synthesis + Exit              │
│   └─────────────────────┘                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Loop Exit Criteria

```typescript
interface LoopExitCriteria {
  maxIterations: number;              // Hard limit (default: 10)
  maxDurationMinutes: number;         // Time limit (default: 30)
  minConfidenceScore: number;         // 0-1 (default: 0.7)
  saturationThreshold: number;        // New findings % (default: 0.1)
  requiredSubtopicCoverage: number;   // % of subtopics (default: 0.8)
}
```

### Event Types

```typescript
// src/types/events.ts
type AgentEventType =
  // Session events
  | 'session_status'
  | 'iteration_started'
  | 'iteration_complete'

  // Planning events
  | 'plan_created'
  | 'plan_updated'

  // Agent lifecycle
  | 'agent_spawned'
  | 'agent_status'
  | 'agent_progress'
  | 'agent_completed'

  // Research events
  | 'search_started'
  | 'search_complete'
  | 'finding_added'
  | 'knowledge_updated'

  // Synthesis events
  | 'synthesis_started'
  | 'synthesis_chunk'
  | 'synthesis_complete'

  // User interaction
  | 'feedback_received'
  | 'feedback_processed'

  // Completion
  | 'research_complete'
  | 'error';

interface AgentEvent {
  type: AgentEventType;
  sessionId: string;
  agentId?: string;
  timestamp: number;
  data?: unknown;
}
```

---

## Knowledge Storage

### Two-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KNOWLEDGE STORAGE SYSTEM                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    COMBINED KNOWLEDGE BASE                           │    │
│  │                    (Orchestrator Managed)                            │    │
│  │                                                                      │    │
│  │  • Merged findings from all agents                                   │    │
│  │  • Deduplicated and conflict-resolved                                │    │
│  │  • Categorized by subtopic                                           │    │
│  │  • Confidence-weighted                                               │    │
│  │  • Source-attributed                                                 │    │
│  │  • Versioned (tracks changes across iterations)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              ▲                                               │
│                              │ Merge & Reconcile                            │
│          ┌───────────────────┼───────────────────┐                          │
│          │                   │                   │                          │
│  ┌───────┴───────┐   ┌───────┴───────┐   ┌───────┴───────┐                 │
│  │ Agent 1       │   │ Agent 2       │   │ Agent N       │                 │
│  │ Knowledge     │   │ Knowledge     │   │ Knowledge     │                 │
│  │               │   │               │   │               │                 │
│  │ • Findings    │   │ • Findings    │   │ • Findings    │                 │
│  │ • Sources     │   │ • Sources     │   │ • Sources     │                 │
│  │ • Search log  │   │ • Search log  │   │ • Search log  │                 │
│  │ • Reasoning   │   │ • Reasoning   │   │ • Reasoning   │                 │
│  └───────────────┘   └───────────────┘   └───────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Knowledge Entry Structure

```typescript
// src/types/knowledge.ts
interface KnowledgeEntry {
  id: string;
  sessionId: string;

  // Content
  content: string;
  summary: string;
  category: string;
  tags: string[];

  // Provenance
  sourceAgentId: string;
  sources: SourceReference[];
  extractedAt: Date;

  // Quality metrics
  confidence: number;    // 0-1
  relevance: number;     // 0-1
  novelty: number;       // 0-1

  // Relationships
  relatedEntries: string[];
  contradicts: string[];
  supports: string[];

  // Versioning
  version: number;
  previousVersionId?: string;
  mergedFrom?: string[];
}

interface SourceReference {
  url: string;
  title: string;
  excerpt: string;
  accessedAt: Date;
  reliability: number;
}
```

---

## Data Models

### Research Session

```typescript
// src/types/research.ts
interface ResearchSession {
  id: string;
  topic: string;
  status: 'planning' | 'researching' | 'awaiting_feedback' | 'synthesizing' | 'completed' | 'error';

  // Configuration
  config: ResearchConfig;
  promptConfig?: AgentPromptConfig;
  exitCriteria: LoopExitCriteria;

  // State
  currentIteration: number;
  plan?: ResearchPlan;

  // Timing
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface ResearchConfig {
  maxAgents: number;
  maxSearchesPerAgent: number;
  depthLevel: 'shallow' | 'medium' | 'deep';
  focusAreas?: string[];
  excludeTopics?: string[];
}
```

### Research Plan

```typescript
interface ResearchPlan {
  mainTopic: string;
  subtopics: {
    id: string;
    title: string;
    description: string;
    searchQueries: string[];
    assignedAgent?: string;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
  strategy: string;
}
```

### Synthesis

```typescript
interface Synthesis {
  id: string;
  sessionId: string;
  iteration: number;
  isFinal: boolean;

  summary: string;
  keyFindings: {
    title: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    sources: string[];
  }[];
  sections: {
    title: string;
    content: string;
    sources: string[];
  }[];

  confidence: number;
  generatedAt: Date;
}
```

---

## Database Schema (Drizzle)

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const researchSessions = sqliteTable('research_sessions', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  status: text('status').notNull(),
  currentIteration: integer('current_iteration').default(0),
  config: text('config', { mode: 'json' }).notNull(),
  promptConfig: text('prompt_config', { mode: 'json' }),
  exitCriteria: text('exit_criteria', { mode: 'json' }),
  plan: text('plan', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  role: text('role').notNull(),
  status: text('status').notNull(),
  assignedSubtopic: text('assigned_subtopic'),
  customPrompt: text('custom_prompt'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const knowledgeEntries = sqliteTable('knowledge_entries', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  agentId: text('agent_id').references(() => agents.id),
  iteration: integer('iteration').notNull(),

  content: text('content').notNull(),
  summary: text('summary'),
  category: text('category'),
  tags: text('tags', { mode: 'json' }),

  confidence: real('confidence'),
  relevance: real('relevance'),
  novelty: real('novelty'),

  relatedEntries: text('related_entries', { mode: 'json' }),
  contradicts: text('contradicts', { mode: 'json' }),
  supports: text('supports', { mode: 'json' }),

  version: integer('version').default(1),
  previousVersionId: text('previous_version_id'),
  mergedFrom: text('merged_from', { mode: 'json' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

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

export const syntheses = sqliteTable('syntheses', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  iteration: integer('iteration'),
  isFinal: integer('is_final', { mode: 'boolean' }).default(false),
  summary: text('summary').notNull(),
  keyFindings: text('key_findings', { mode: 'json' }).notNull(),
  sections: text('sections', { mode: 'json' }).notNull(),
  confidence: real('confidence'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

export const userFeedback = sqliteTable('user_feedback', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  iteration: integer('iteration').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

export const knowledgeGaps = sqliteTable('knowledge_gaps', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => researchSessions.id),
  iteration: integer('iteration').notNull(),
  subtopic: text('subtopic'),
  description: text('description').notNull(),
  priority: text('priority'),
  suggestedQueries: text('suggested_queries', { mode: 'json' }),
  resolved: integer('resolved', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

export const savedPrompts = sqliteTable('saved_prompts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  agentType: text('agent_type').notNull(),
  promptText: text('prompt_text').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
});
```

---

## API Routes Summary

### tRPC Procedures (Type-Safe Queries)

| Procedure | Type | Description |
|-----------|------|-------------|
| `sessions.list` | Query | List all research sessions |
| `sessions.get` | Query | Get session with agents & syntheses |
| `sessions.getKnowledge` | Query | Get combined knowledge base |
| `sessions.getGaps` | Query | Get identified knowledge gaps |
| `settings.get` | Query | Get app settings |
| `settings.update` | Mutation | Update settings |

### Server Functions (Mutations)

| Function | Description |
|----------|-------------|
| `createSession` | Start new research session |
| `deleteSession` | Cancel/delete session |
| `submitFeedback` | Send user feedback to orchestrator |
| `finishSession` | Request immediate completion |
| `pauseSession` | Pause research loop |
| `resumeSession` | Resume paused session |

### API Routes (Streaming)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/research/sessions/$id/stream` | GET | SSE event stream |
| `/api/research/sessions/$id/export` | GET | Export results (format param) |

---

## Environment Configuration

```env
# App
VITE_APP_TITLE="Deep Search"

# Database (SQLite for local)
DATABASE_URL="file:./data/deep-search.db"
# DATABASE_URL="postgresql://user:pass@localhost:5432/deep_search"

# LLM Provider (pick one)
ANTHROPIC_API_KEY=your_anthropic_api_key
# OPENAI_API_KEY=your_openai_api_key
# OLLAMA_BASE_URL=http://localhost:11434

# Web Search (self-hosted)
SEARCH_PROVIDER=searxng  # searxng | scraper
SEARXNG_URL=http://localhost:8080

# Scraper Settings (when using built-in scraper)
SCRAPER_TIMEOUT=30000
SCRAPER_MAX_CONCURRENT=5

# Research Defaults
DEFAULT_MAX_AGENTS=3
DEFAULT_MAX_SEARCHES_PER_AGENT=5
DEFAULT_DEPTH_LEVEL=medium
```

---

## Local Deployment Options

### Option 1: Minimal (SQLite + Ollama + Built-in Scraper)

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/deep-search.db
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - SEARCH_PROVIDER=scraper
    volumes:
      - ./data:/app/data

# Run Ollama separately on host: ollama serve
```

### Option 2: Full Stack (SQLite + Ollama + SearXNG)

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/deep-search.db
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - SEARCH_PROVIDER=searxng
      - SEARXNG_URL=http://searxng:8080
    volumes:
      - ./data:/app/data
    depends_on:
      - searxng

  searxng:
    image: searxng/searxng
    ports:
      - "8080:8080"
    volumes:
      - ./searxng:/etc/searxng
```

### Option 3: Production (PostgreSQL + SearXNG)

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/deep_search
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SEARCH_PROVIDER=searxng
      - SEARXNG_URL=http://searxng:8080
    depends_on:
      - db
      - searxng

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: deep_search
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  searxng:
    image: searxng/searxng
    volumes:
      - ./searxng:/etc/searxng

volumes:
  postgres_data:
```

---

## Implementation Phases

### Phase 1: Foundation
- [x] TanStack Start project setup
- [x] TanStack AI integration
- [x] Drizzle ORM + SQLite
- [x] tRPC setup
- [ ] Database schema migration
- [ ] Search provider abstraction

### Phase 2: Agent System
- [ ] Event bus implementation
- [ ] Base agent class
- [ ] Agent pool management
- [ ] SSE streaming endpoint

### Phase 3: Deep Research Module
- [ ] Orchestrator agent with planning
- [ ] Researcher agent with search + analysis
- [ ] Synthesizer agent
- [ ] Session management service
- [ ] Knowledge store service

### Phase 4: UI Components
- [ ] Research setup page
- [ ] Agent status panel
- [ ] Real-time synthesis view
- [ ] Feedback bar
- [ ] Results & export view

### Phase 5: Polish
- [ ] Error handling & recovery
- [ ] Export functionality (Markdown, PDF)
- [ ] Session history
- [ ] Settings UI

---

## Key Differences from Express Architecture

| Aspect | Previous (Express) | TanStack Start |
|--------|-------------------|----------------|
| Structure | Monorepo (apps/backend, apps/frontend) | Single unified app |
| API | REST endpoints | tRPC + Server Functions |
| Real-time | WebSocket | Server-Sent Events (SSE) |
| Data fetching | Manual fetch | TanStack Query + tRPC |
| Type safety | Shared types package | End-to-end via tRPC |
| State | Separate stores | TanStack Store + Query cache |
| Deployment | Separate builds | Single Nitro deployment |

---

## Future Modules (Extensibility)

The modular architecture allows adding new capabilities:

- **Document Analysis Module** - Upload and analyze documents
- **Comparison Module** - Compare multiple topics side-by-side
- **Fact Checking Module** - Verify claims against sources
- **Summarization Module** - Summarize long documents or URLs
- **Citation Module** - Generate properly formatted citations
