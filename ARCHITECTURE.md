# Deep Research LLM Application - Architecture

A modular, self-contained LLM application for deep research that runs entirely locally or self-hosted.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, TypeScript, Express |
| Database | SQLite (local) / PostgreSQL (self-hosted) |
| Queue | BullMQ with Redis (or in-memory for simple deployments) |
| LLM Provider | OpenRouter API / Local OpenAI-compatible (Ollama, LM Studio, vLLM) |
| Web Search | SearXNG (self-hosted) / Built-in scraper (Playwright) |
| Real-time | WebSocket (native ws library) |

**Note:** No external APIs required except for optional cloud LLM providers. All search functionality is self-hosted.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Research Input  │  Agent Status Panel  │  Synthesis Results View  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              WebSocket Client                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Node.js)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         API Gateway (Express)                         │   │
│  │              REST Endpoints  │  WebSocket Handler                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         MODULE SYSTEM                                 │   │
│  │    ┌────────────────────┐  ┌────────────────┐  ┌────────────────┐    │   │
│  │    │  Deep Research     │  │  Future        │  │  Future        │    │   │
│  │    │  Module            │  │  Module A      │  │  Module B      │    │   │
│  │    └────────────────────┘  └────────────────┘  └────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      AGENT ORCHESTRATION                              │   │
│  │                                                                       │   │
│  │                    ┌─────────────────────┐                            │   │
│  │                    │  Orchestrator Agent │                            │   │
│  │                    │  (Master Controller)│                            │   │
│  │                    └──────────┬──────────┘                            │   │
│  │                               │                                       │   │
│  │          ┌────────────────────┼────────────────────┐                  │   │
│  │          ▼                    ▼                    ▼                  │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │   │
│  │  │  Researcher  │    │  Researcher  │    │  Researcher  │            │   │
│  │  │  Agent 1     │    │  Agent 2     │    │  Agent N     │            │   │
│  │  └──────────────┘    └──────────────┘    └──────────────┘            │   │
│  │          │                    │                    │                  │   │
│  │          └────────────────────┼────────────────────┘                  │   │
│  │                               ▼                                       │   │
│  │                    ┌─────────────────────┐                            │   │
│  │                    │  Synthesizer Agent  │                            │   │
│  │                    └─────────────────────┘                            │   │
│  │                                                                       │   │
│  │                       Message Bus (Event-driven)                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
          ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
          │   LLM Provider  │ │ Web Search  │ │   Database      │
          │                 │ │ (self-host) │ │                 │
          │ • OpenRouter    │ │             │ │ • SQLite (local)│
          │ • Ollama        │ │ • SearXNG   │ │ • PostgreSQL    │
          │ • LM Studio     │ │ • Playwright│ │                 │
          │ • vLLM          │ │   scraper   │ │                 │
          └─────────────────┘ └─────────────┘ └─────────────────┘
```

---

## Folder Structure

```
deep-search/
├── packages/
│   └── shared/                      # Shared types and utilities
│       ├── src/
│       │   ├── types/
│       │   │   ├── agents.ts        # Agent interfaces
│       │   │   ├── research.ts      # Research session types
│       │   │   ├── messages.ts      # Inter-agent message types
│       │   │   ├── llm.ts           # LLM provider types
│       │   │   ├── search.ts        # Search provider types
│       │   │   └── events.ts        # WebSocket event types
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts             # Entry point
│   │   │   ├── server.ts            # Express + WebSocket setup
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── index.ts         # Config loader
│   │   │   │   └── schema.ts        # Config validation
│   │   │   │
│   │   │   ├── core/
│   │   │   │   ├── module-registry/ # Plugin system for modules
│   │   │   │   │   ├── registry.ts
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── agents/          # Agent framework
│   │   │   │   │   ├── base-agent.ts
│   │   │   │   │   ├── agent-pool.ts
│   │   │   │   │   └── message-bus.ts
│   │   │   │   │
│   │   │   │   ├── llm/             # LLM provider abstraction
│   │   │   │   │   ├── provider.ts  # Interface
│   │   │   │   │   ├── openrouter.ts
│   │   │   │   │   └── openai-compat.ts  # Ollama, LM Studio, etc.
│   │   │   │   │
│   │   │   │   ├── search/          # Web search (self-hosted only)
│   │   │   │   │   ├── provider.ts  # Interface
│   │   │   │   │   ├── searxng.ts   # SearXNG integration
│   │   │   │   │   ├── scraper.ts   # Playwright-based scraper
│   │   │   │   │   └── parser.ts    # HTML content extraction
│   │   │   │   │
│   │   │   │   └── websocket/
│   │   │   │       ├── handler.ts
│   │   │   │       └── rooms.ts
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   └── deep-research/
│   │   │   │       ├── index.ts     # Module registration
│   │   │   │       ├── routes.ts    # API endpoints
│   │   │   │       ├── agents/
│   │   │   │       │   ├── orchestrator.ts
│   │   │   │       │   ├── researcher.ts
│   │   │   │       │   └── synthesizer.ts
│   │   │   │       ├── services/
│   │   │   │       │   ├── session-manager.ts
│   │   │   │       │   └── research-planner.ts
│   │   │   │       └── prompts/
│   │   │   │           ├── orchestrator.ts
│   │   │   │           ├── researcher.ts
│   │   │   │           └── synthesizer.ts
│   │   │   │
│   │   │   └── database/
│   │   │       ├── client.ts
│   │   │       ├── schema.ts        # Drizzle/Prisma schema
│   │   │       └── repositories/
│   │   │
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   │
│       │   ├── components/
│       │   │   ├── ui/              # shadcn/ui components
│       │   │   ├── layout/
│       │   │   └── common/
│       │   │
│       │   ├── modules/
│       │   │   └── deep-research/
│       │   │       ├── pages/
│       │   │       │   └── ResearchPage.tsx
│       │   │       ├── components/
│       │   │       │   ├── TopicInput.tsx
│       │   │       │   ├── AgentStatusPanel.tsx
│       │   │       │   ├── ResearchTimeline.tsx
│       │   │       │   └── SynthesisView.tsx
│       │   │       ├── hooks/
│       │   │       │   └── useResearchSession.ts
│       │   │       └── store/
│       │   │           └── research-store.ts
│       │   │
│       │   ├── lib/
│       │   │   ├── websocket.ts
│       │   │   └── api-client.ts
│       │   │
│       │   └── stores/
│       │       └── app-store.ts
│       │
│       ├── index.html
│       └── package.json
│
├── docker-compose.yml               # Local deployment
├── .env.example
└── package.json                     # Workspace root
```

---

## Core Abstractions

### LLM Provider Interface

```typescript
interface LLMProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
}

// Implementations:
// - OpenRouterProvider: Uses OpenRouter API
// - OpenAICompatProvider: Works with Ollama, LM Studio, vLLM, LocalAI
```

### Web Search Provider Interface (Self-Hosted Only)

```typescript
interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  fetchPage(url: string): Promise<PageContent>;  // For deep content extraction
}

// Implementations (no external APIs):
// - SearXNGProvider: Self-hosted meta search engine (aggregates Google, Bing, DuckDuckGo, etc.)
// - PlaywrightScraper: Direct web scraping with headless browser for content extraction
```

### Web Scraping Layer

```typescript
interface WebScraper {
  // Fetch and extract content from URLs found in search results
  scrape(url: string): Promise<ScrapedContent>;
  scrapeMultiple(urls: string[]): Promise<ScrapedContent[]>;
}

interface ScrapedContent {
  url: string;
  title: string;
  content: string;        // Cleaned text content
  markdown: string;       // Markdown formatted
  links: string[];        // Outbound links for deeper research
  metadata: {
    author?: string;
    publishedDate?: string;
    description?: string;
  };
}

// Uses Playwright for JavaScript-rendered pages
// Falls back to simple fetch + cheerio for static pages
```

### Agent Interface

```typescript
abstract class BaseAgent {
  abstract run(): Promise<void>;
  abstract handleMessage(message: AgentMessage): Promise<void>;

  protected sendMessage(to: AgentId, type: MessageType, payload: unknown): void;
  protected updateStatus(status: AgentStatus): void;
}
```

---

## Agent System Design

### Research Loop (Iterative with User Feedback)

The research process runs in a **continuous loop** until the Orchestrator decides to exit or the user intervenes. Users can provide feedback at any point to guide the research direction.

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

### Loop Exit Conditions

The Orchestrator decides to exit the loop when:

1. **Saturation**: No new significant findings in last N iterations
2. **Coverage**: All planned subtopics adequately researched
3. **Confidence**: Synthesis confidence score exceeds threshold
4. **User Signal**: User explicitly requests completion
5. **Resource Limits**: Max iterations or time limit reached

```typescript
interface LoopExitCriteria {
  maxIterations: number;              // Hard limit (default: 10)
  maxDurationMinutes: number;         // Time limit (default: 30)
  minConfidenceScore: number;         // 0-1, synthesis confidence (default: 0.7)
  saturationThreshold: number;        // New findings % that triggers exit (default: 0.1)
  requiredSubtopicCoverage: number;   // % of subtopics covered (default: 0.8)
}
```

### Detailed Research Flow

```
1. INITIALIZATION
   │
   ├── User enters topic
   ├── User optionally configures:
   │   • Research depth (shallow/medium/deep)
   │   • Custom system prompts for agents
   │   • Focus areas to prioritize
   │   • Areas to exclude
   │   • Exit criteria overrides
   │
   ▼
2. PLANNING PHASE
   │
   ├── Orchestrator analyzes topic
   ├── Generates research plan with subtopics
   ├── Determines agent allocation
   ├── Initializes Knowledge Storage
   │
   ▼
3. RESEARCH LOOP ←──────────────────────────────────┐
   │                                                 │
   ├── Orchestrator spawns/assigns Researcher Agents │
   │                                                 │
   ├── Researchers work in parallel:                 │
   │   ├── Execute web searches                      │
   │   ├── Scrape and analyze content                │
   │   ├── Extract findings with confidence scores   │
   │   ├── Store in per-agent Knowledge Storage      │
   │   └── Report to Orchestrator                    │
   │                                                 │
   ├── Orchestrator evaluates findings:              │
   │   ├── Merge into Combined Knowledge Storage     │
   │   ├── Identify gaps and contradictions          │
   │   ├── Request clarifications if needed          │
   │   └── Plan next research directions             │
   │                                                 │
   ├── Synthesis (incremental):                      │
   │   ├── Generate current state summary            │
   │   ├── Update key findings list                  │
   │   └── Present to user with progress             │
   │                                                 │
   ├── User Feedback Window:                         │
   │   ├── User reviews current synthesis            │
   │   ├── User can provide guidance                 │
   │   ├── User can approve and continue             │
   │   └── User can request completion               │
   │                                                 │
   ├── Orchestrator Decision:                        │
   │   ├── Check exit criteria                       │
   │   ├── Process user feedback                     │
   │   └── Continue or Exit?                         │
   │       │                                         │
   │       ├── CONTINUE ─────────────────────────────┘
   │       │
   │       └── EXIT ─────────┐
   │                         │
   ▼                         │
4. FINAL SYNTHESIS           │
   │◄────────────────────────┘
   ├── Comprehensive summary generation
   ├── Structured report with all sections
   ├── Source compilation and verification
   ├── Confidence assessment
   │
   ▼
5. COMPLETION
   │
   ├── Final report presented
   ├── Export options available
   └── Session saved to history
```

### Message Types

```typescript
enum MessageType {
  // Orchestrator → Researcher
  ASSIGN_TASK = 'assign_task',
  REQUEST_CLARIFICATION = 'request_clarification',
  EXPAND_RESEARCH = 'expand_research',
  STOP_RESEARCH = 'stop_research',

  // Researcher → Orchestrator
  FINDING_REPORT = 'finding_report',
  TASK_COMPLETED = 'task_completed',
  CLARIFICATION_RESPONSE = 'clarification_response',

  // Orchestrator → Synthesizer
  SYNTHESIZE_REQUEST = 'synthesize_request',

  // Synthesizer → Orchestrator
  SYNTHESIS_COMPLETE = 'synthesis_complete',

  // User Feedback (via Orchestrator)
  USER_FEEDBACK = 'user_feedback',
  USER_STOP_REQUEST = 'user_stop_request',
}
```

---

## Knowledge Storage

Two-tier knowledge storage system: per-agent working memory and combined research knowledge base.

### Architecture

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
interface KnowledgeEntry {
  id: string;
  sessionId: string;

  // Content
  content: string;                    // The actual finding/fact
  summary: string;                    // One-line summary
  category: string;                   // Subtopic category
  tags: string[];                     // Searchable tags

  // Provenance
  sourceAgentId: string;
  sources: SourceReference[];
  extractedAt: Date;

  // Quality metrics
  confidence: number;                 // 0-1 agent confidence
  relevance: number;                  // 0-1 relevance to main topic
  novelty: number;                    // 0-1 how new vs existing knowledge

  // Relationships
  relatedEntries: string[];           // Links to related findings
  contradicts: string[];              // Links to contradicting findings
  supports: string[];                 // Links to supporting findings

  // Versioning
  version: number;
  previousVersionId?: string;
  mergedFrom?: string[];              // If created by merging entries
}

interface SourceReference {
  url: string;
  title: string;
  excerpt: string;                    // Relevant quote
  accessedAt: Date;
  reliability: number;                // 0-1 source reliability estimate
}

interface AgentKnowledge {
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

interface CombinedKnowledge {
  sessionId: string;
  iteration: number;

  entries: KnowledgeEntry[];          // Merged and deduplicated

  // Synthesis helpers
  keyThemes: Theme[];
  contradictions: Contradiction[];
  gaps: KnowledgeGap[];

  // Metrics
  overallConfidence: number;
  coverageBySubtopic: Map<string, number>;

  updatedAt: Date;
}

interface Theme {
  id: string;
  title: string;
  description: string;
  supportingEntries: string[];
  strength: number;                   // How well-supported
}

interface Contradiction {
  id: string;
  description: string;
  entries: string[];                  // Conflicting entry IDs
  resolved: boolean;
  resolution?: string;
}

interface KnowledgeGap {
  id: string;
  subtopic: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedQueries: string[];
}
```

### Knowledge Operations

```typescript
interface KnowledgeStore {
  // Agent operations
  addEntry(agentId: string, entry: KnowledgeEntry): Promise<void>;
  getAgentKnowledge(agentId: string): Promise<AgentKnowledge>;

  // Combined operations
  mergeAgentKnowledge(agentIds: string[]): Promise<CombinedKnowledge>;
  getCombinedKnowledge(sessionId: string): Promise<CombinedKnowledge>;

  // Query operations
  search(query: string, filters?: KnowledgeFilters): Promise<KnowledgeEntry[]>;
  findRelated(entryId: string): Promise<KnowledgeEntry[]>;
  findContradictions(): Promise<Contradiction[]>;
  identifyGaps(plan: ResearchPlan): Promise<KnowledgeGap[]>;

  // Analysis
  calculateCoverage(plan: ResearchPlan): Promise<Map<string, number>>;
  assessNovelty(newEntry: KnowledgeEntry): Promise<number>;
}
```

---

## Custom Agent Prompts

Users can customize the behavior of each agent type through system prompts. Default prompts are provided but can be overridden per-session.

### Prompt Configuration

```typescript
interface AgentPromptConfig {
  // Override default system prompts
  orchestratorPrompt?: string;
  researcherPrompt?: string;
  synthesizerPrompt?: string;

  // Additional instructions appended to defaults
  orchestratorInstructions?: string;
  researcherInstructions?: string;
  synthesizerInstructions?: string;

  // Research focus/style
  researchStyle?: 'academic' | 'journalistic' | 'technical' | 'general';
  outputTone?: 'formal' | 'casual' | 'technical';

  // Domain-specific context
  domainContext?: string;            // e.g., "This research is for a medical professional"
  priorKnowledge?: string;           // What user already knows

  // Constraints
  avoidTopics?: string[];
  requiredSources?: string[];        // Domains to prioritize
  excludedSources?: string[];        // Domains to avoid
}
```

### Default Prompt Templates

```typescript
const DEFAULT_PROMPTS = {
  orchestrator: `
You are a Research Orchestrator managing a deep research session.

Your responsibilities:
1. Analyze the research topic and create a comprehensive plan
2. Break down the topic into subtopics for parallel research
3. Assign tasks to researcher agents
4. Evaluate incoming findings for quality and relevance
5. Identify gaps, contradictions, and areas needing clarification
6. Decide when research is sufficient to synthesize
7. Coordinate the final synthesis

Decision guidelines:
- Request clarification when findings are ambiguous
- Expand research when coverage is insufficient
- Stop when confidence threshold is met or saturation is reached
- Always consider user feedback in your decisions

Current session context:
{sessionContext}

User's custom instructions:
{customInstructions}
`,

  researcher: `
You are a Research Agent conducting focused investigation on a specific subtopic.

Your responsibilities:
1. Execute targeted web searches based on your assigned queries
2. Analyze search results and extract relevant information
3. Assess source credibility and assign confidence scores
4. Identify key findings and supporting evidence
5. Note contradictions or gaps in available information
6. Suggest follow-up queries for deeper investigation

Research guidelines:
- Prioritize authoritative and recent sources
- Cross-reference claims across multiple sources
- Clearly distinguish facts from opinions
- Note uncertainty when information is conflicting

Your assigned subtopic: {subtopic}
Search queries to execute: {searchQueries}

User's custom instructions:
{customInstructions}
`,

  synthesizer: `
You are a Research Synthesizer creating comprehensive summaries from collected findings.

Your responsibilities:
1. Aggregate findings from all research agents
2. Identify overarching themes and patterns
3. Resolve or highlight contradictions
4. Create a coherent narrative from disparate sources
5. Ensure all claims are properly attributed
6. Generate structured output with clear sections

Synthesis guidelines:
- Lead with the most important findings
- Group related information logically
- Maintain source attribution throughout
- Indicate confidence levels for conclusions
- Highlight areas of uncertainty or debate

Output style: {outputStyle}

User's custom instructions:
{customInstructions}
`
};
```

### Prompt Variables

Available variables that get injected into prompts:

| Variable | Description |
|----------|-------------|
| `{sessionContext}` | Current session state, topic, iteration count |
| `{customInstructions}` | User-provided additional instructions |
| `{subtopic}` | Assigned subtopic for researcher |
| `{searchQueries}` | List of queries to execute |
| `{outputStyle}` | User's preferred output format |
| `{knowledgeSummary}` | Summary of current knowledge base |
| `{previousFindings}` | Findings from previous iterations |
| `{userFeedback}` | Latest user feedback if any |

---

## Data Models

### Research Session

```typescript
interface ResearchSession {
  id: string;
  topic: string;
  status: 'planning' | 'researching' | 'awaiting_feedback' | 'synthesizing' | 'completed' | 'error';

  // Configuration
  config: ResearchConfig;
  promptConfig: AgentPromptConfig;
  exitCriteria: LoopExitCriteria;

  // State
  currentIteration: number;
  plan?: ResearchPlan;
  agents: AgentState[];

  // Knowledge
  combinedKnowledge?: CombinedKnowledge;

  // Outputs
  syntheses: Synthesis[];             // One per iteration
  finalSynthesis?: Synthesis;

  // User interaction
  feedbackHistory: UserFeedback[];

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

interface UserFeedback {
  id: string;
  iteration: number;
  timestamp: Date;
  type: 'guidance' | 'approval' | 'stop' | 'redirect';
  content: string;
  processed: boolean;
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
  }[];
  strategy: string;
}
```

### Finding

```typescript
interface Finding {
  id: string;
  agentId: string;
  content: string;
  sources: {
    url: string;
    title: string;
    snippet: string;
    relevanceScore: number;
  }[];
  confidence: number;
  category: string;
  timestamp: Date;
}
```

### Synthesis

```typescript
interface Synthesis {
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
  generatedAt: Date;
}
```

---

## UX Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. LANDING / HOME
   │
   │  User sees:
   │  • New research button
   │  • Recent sessions list
   │  • Settings access
   │
   └──→ Click "New Research"
           │
           ▼
2. RESEARCH SETUP
   │
   │  User configures:
   │  ┌─────────────────────────────────────────────────────────────┐
   │  │ [Required]                                                  │
   │  │ • Topic input (text field)                                  │
   │  │                                                             │
   │  │ [Optional - Expandable "Advanced Settings"]                 │
   │  │ • Depth: Shallow / Medium / Deep (radio)                    │
   │  │ • Focus areas (tag input)                                   │
   │  │ • Exclude topics (tag input)                                │
   │  │ • Max iterations (slider, 1-20)                             │
   │  │ • Custom agent prompts (collapsible text areas)             │
   │  │   - Orchestrator instructions                               │
   │  │   - Researcher instructions                                 │
   │  │   - Synthesizer instructions                                │
   │  └─────────────────────────────────────────────────────────────┘
   │
   └──→ Click "Start Research"
           │
           ▼
3. RESEARCH IN PROGRESS (Main Loop)
   │
   │  ┌─────────────────────────────────────────────────────────────┐
   │  │                    RESEARCH VIEW                            │
   │  │                                                             │
   │  │  ┌─────────────────┬───────────────────────────────────┐   │
   │  │  │  LEFT PANEL     │  MAIN CONTENT                     │   │
   │  │  │                 │                                    │   │
   │  │  │  Agent Status   │  Current Synthesis                │   │
   │  │  │  ┌───────────┐  │  (updates live)                   │   │
   │  │  │  │ Agent 1   │  │                                    │   │
   │  │  │  │ ████░░ 60%│  │  Key Findings So Far:             │   │
   │  │  │  ├───────────┤  │  • Finding 1...                   │   │
   │  │  │  │ Agent 2   │  │  • Finding 2...                   │   │
   │  │  │  │ ██████ 90%│  │                                    │   │
   │  │  │  ├───────────┤  │  ─────────────────────────────    │   │
   │  │  │  │ Agent 3   │  │                                    │   │
   │  │  │  │ ██░░░░ 30%│  │  Detailed Sections:               │   │
   │  │  │  └───────────┘  │  [Expandable sections...]         │   │
   │  │  │                 │                                    │   │
   │  │  │  Iteration: 2/10│                                    │   │
   │  │  │                 │                                    │   │
   │  │  │  [View Details] │                                    │   │
   │  │  └─────────────────┴───────────────────────────────────┘   │
   │  │                                                             │
   │  │  ┌─────────────────────────────────────────────────────┐   │
   │  │  │  FEEDBACK BAR                                       │   │
   │  │  │  ┌───────────────────────────────────────────────┐  │   │
   │  │  │  │ [Text input: "Go deeper on...", "Ignore..."] │  │   │
   │  │  │  └───────────────────────────────────────────────┘  │   │
   │  │  │  [Send Feedback]  [Looks Good, Continue]  [Finish] │   │
   │  │  └─────────────────────────────────────────────────────┘   │
   │  └─────────────────────────────────────────────────────────────┘
   │
   │  Loop behaviors:
   │  • Synthesis updates after each agent reports
   │  • User can send feedback anytime (non-blocking)
   │  • "Finish" triggers final synthesis
   │  • Auto-proceeds if no feedback within timeout
   │
   └──→ Research completes (auto or manual)
           │
           ▼
4. RESULTS VIEW
   │
   │  ┌─────────────────────────────────────────────────────────────┐
   │  │                    FINAL RESULTS                            │
   │  │                                                             │
   │  │  Topic: "Your Research Topic"                              │
   │  │  Completed: 2024-01-15 14:30 | Iterations: 5 | Sources: 47 │
   │  │                                                             │
   │  │  ┌─────────────────────────────────────────────────────┐   │
   │  │  │  EXECUTIVE SUMMARY                                  │   │
   │  │  │  [Collapsible full summary text...]                 │   │
   │  │  └─────────────────────────────────────────────────────┘   │
   │  │                                                             │
   │  │  ┌─────────────────────────────────────────────────────┐   │
   │  │  │  KEY FINDINGS                                       │   │
   │  │  │  ⭐ High: Finding title [2 sources]                 │   │
   │  │  │  ⭐ High: Finding title [3 sources]                 │   │
   │  │  │  ◆ Medium: Finding title [1 source]                 │   │
   │  │  └─────────────────────────────────────────────────────┘   │
   │  │                                                             │
   │  │  ┌─────────────────────────────────────────────────────┐   │
   │  │  │  DETAILED SECTIONS (tabs or accordion)              │   │
   │  │  │  [Section 1] [Section 2] [Section 3] ...            │   │
   │  │  └─────────────────────────────────────────────────────┘   │
   │  │                                                             │
   │  │  ┌─────────────────────────────────────────────────────┐   │
   │  │  │  SOURCES                                            │   │
   │  │  │  • source1.com - "Title" (cited 5x)                 │   │
   │  │  │  • source2.org - "Title" (cited 3x)                 │   │
   │  │  └─────────────────────────────────────────────────────┘   │
   │  │                                                             │
   │  │  [Export: Markdown] [Export: PDF] [Continue Research]      │
   │  └─────────────────────────────────────────────────────────────┘
   │
   └──→ User can:
        • Export results
        • Continue research (returns to loop)
        • Start new research
        • Go to history
```

### Interaction Patterns

| Action | Trigger | System Response |
|--------|---------|-----------------|
| Start Research | Click "Start" | Create session, show research view |
| Send Feedback | Type + click "Send" | Queue feedback, continue research |
| Quick Approve | Click "Looks Good" | Log approval, continue to next iteration |
| Finish Early | Click "Finish" | Trigger final synthesis immediately |
| Expand Agent | Click agent card | Show agent's findings, search history |
| View Source | Click source link | Open in new tab |
| Export | Click export button | Generate and download file |
| Continue Research | Click from results | Resume loop with existing knowledge |

### Feedback Types and Effects

| Feedback Type | Example | Orchestrator Action |
|--------------|---------|---------------------|
| Redirect | "Focus more on X" | Reprioritize subtopics, spawn new agent for X |
| Expand | "Go deeper on Y" | Assign expansion task to agent |
| Exclude | "Ignore Z" | Mark Z as excluded, filter from synthesis |
| Clarify | "What about W?" | Add W as new subtopic |
| Approve | "This looks good" | Continue with current direction |
| Complete | "This is enough" | Exit loop, final synthesis |

---

## UI Description

### Layout Overview

Single-page application with responsive design. Three main views:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [Logo] Deep Search          [History] [Settings] [Theme Toggle]         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MAIN CONTENT AREA                                                          │
│  (changes based on current view)                                            │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### View Components

#### 1. Home View
- **New Research Card**: Prominent CTA, topic input with "Start" button
- **Recent Sessions**: List of last 5-10 sessions with status badges
- **Quick Stats**: Total sessions, average research time, etc.

#### 2. Research Setup View
- **Topic Input**: Large text field with placeholder examples
- **Advanced Settings**: Collapsible panel with:
  - Depth selector (3 radio buttons with descriptions)
  - Focus areas (tag input with autocomplete)
  - Exclusions (tag input)
  - Iteration limit (slider)
- **Custom Prompts**: Collapsible section with three text areas
- **Action Buttons**: "Start Research", "Cancel"

#### 3. Research View (Active Session)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Topic: "Understanding quantum computing applications"        Iteration 3/10 │
├────────────────────┬────────────────────────────────────────────────────────┤
│                    │                                                        │
│  AGENT PANEL       │  SYNTHESIS PANEL                                      │
│  (240px width)     │  (flexible)                                           │
│                    │                                                        │
│  ┌──────────────┐  │  ┌──────────────────────────────────────────────────┐ │
│  │ Orchestrator │  │  │ Current Understanding                            │ │
│  │ Planning...  │  │  │                                                  │ │
│  └──────────────┘  │  │ [Live-updating markdown content with            │ │
│                    │  │  key findings, sections, and source             │ │
│  ┌──────────────┐  │  │  citations. Streaming text appearance.]         │ │
│  │ Researcher 1 │  │  │                                                  │ │
│  │ ████████░░   │  │  │                                                  │ │
│  │ Searching... │  │  │                                                  │ │
│  └──────────────┘  │  │                                                  │ │
│                    │  │                                                  │ │
│  ┌──────────────┐  │  │                                                  │ │
│  │ Researcher 2 │  │  │                                                  │ │
│  │ ██████████   │  │  │                                                  │ │
│  │ Complete ✓   │  │  └──────────────────────────────────────────────────┘ │
│  └──────────────┘  │                                                        │
│                    │  ┌──────────────────────────────────────────────────┐ │
│  ┌──────────────┐  │  │ Knowledge Progress                               │ │
│  │ Researcher 3 │  │  │ ████████████████░░░░░░░░ 67% coverage           │ │
│  │ ████░░░░░░   │  │  │ 23 findings | 12 sources | 2 gaps identified    │ │
│  │ Analyzing... │  │  └──────────────────────────────────────────────────┘ │
│  └──────────────┘  │                                                        │
│                    │                                                        │
├────────────────────┴────────────────────────────────────────────────────────┤
│  FEEDBACK BAR                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ [Feedback input...                                          ] [Send]  │ │
│  │                                                                        │ │
│  │ [👍 Continue]    [🎯 Go Deeper]    [✅ Finish Now]                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Agent Panel Components:**
- Agent cards with role icon, status, progress bar
- Click to expand showing: current task, recent findings, search history
- Color-coded status: blue (working), green (complete), yellow (waiting), red (error)

**Synthesis Panel Components:**
- Markdown rendered content with source citations as superscript links
- Collapsible sections for detailed findings
- "Scroll to latest" button when auto-scrolling is paused

**Feedback Bar Components:**
- Text input for free-form guidance
- Quick action buttons with icons
- Subtle feedback history indicator (click to see past feedback)

#### 4. Results View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Research Complete                                              [Export ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Topic: "Understanding quantum computing applications"                       │
│  Completed: Jan 15, 2024 at 2:30 PM | 5 iterations | 47 sources             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ SUMMARY                                                                 ││
│  │                                                                         ││
│  │ [Executive summary paragraph with key takeaways...]                     ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ KEY FINDINGS                                                            ││
│  │                                                                         ││
│  │ ⭐ High Impact                                                          ││
│  │    • Finding 1 with source citation [1][2]                              ││
│  │    • Finding 2 with source citation [3]                                 ││
│  │                                                                         ││
│  │ ◆ Notable                                                               ││
│  │    • Finding 3 with source citation [4]                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [Section 1] [Section 2] [Section 3] [Sources]                          ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │                                                                         ││
│  │ Section content with proper formatting, citations, and                  ││
│  │ expandable details...                                                   ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [Continue Research]  [New Research]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5. History View

- Session list with search/filter
- Each item shows: topic, date, status, iteration count
- Click to open results view
- Bulk actions: delete, export

#### 6. Settings View

- **LLM Configuration**: Provider, URL, model, API key
- **Search Configuration**: Provider selection, SearXNG URL
- **Default Research Settings**: Default depth, max iterations
- **Default Prompts**: Edit default prompts for all agents
- **Theme**: Light/Dark mode toggle

### Component Library (shadcn/ui)

Required components:
- `Button`, `Input`, `Textarea` - Forms
- `Card`, `CardHeader`, `CardContent` - Layout
- `Progress` - Agent progress bars
- `Badge` - Status indicators
- `Tabs`, `TabsList`, `TabsContent` - Section navigation
- `Collapsible` - Expandable sections
- `Dialog` - Modals for settings, confirmations
- `Tooltip` - Help text
- `Skeleton` - Loading states
- `Toast` - Notifications

### Responsive Behavior

| Breakpoint | Layout Change |
|------------|---------------|
| Desktop (>1024px) | Two-column layout, full agent panel |
| Tablet (768-1024px) | Collapsible agent panel, full synthesis |
| Mobile (<768px) | Stacked layout, bottom sheet for agents |

---

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Sessions** |
| POST | `/api/research/sessions` | Start new research session |
| GET | `/api/research/sessions` | List all sessions |
| GET | `/api/research/sessions/:id` | Get session details |
| DELETE | `/api/research/sessions/:id` | Cancel/delete session |
| POST | `/api/research/sessions/:id/resume` | Resume a paused session |
| **Feedback & Control** |
| POST | `/api/research/sessions/:id/feedback` | Submit user feedback |
| POST | `/api/research/sessions/:id/finish` | Request immediate completion |
| POST | `/api/research/sessions/:id/pause` | Pause research loop |
| **Knowledge** |
| GET | `/api/research/sessions/:id/knowledge` | Get combined knowledge base |
| GET | `/api/research/sessions/:id/knowledge/entries` | Get all knowledge entries |
| GET | `/api/research/sessions/:id/knowledge/gaps` | Get identified gaps |
| GET | `/api/research/sessions/:id/agents/:agentId/knowledge` | Get agent's knowledge |
| **Results** |
| GET | `/api/research/sessions/:id/synthesis` | Get current/final synthesis |
| GET | `/api/research/sessions/:id/synthesis/history` | Get all iteration syntheses |
| GET | `/api/research/sessions/:id/sources` | Get all sources |
| GET | `/api/research/sessions/:id/export` | Export results (format query param) |
| **Configuration** |
| GET | `/api/config/prompts/defaults` | Get default agent prompts |
| PUT | `/api/config/prompts/defaults` | Update default prompts |
| GET | `/api/config/settings` | Get app settings |
| PUT | `/api/config/settings` | Update app settings |

### WebSocket Events

**Client → Server:**
- `join_session` - Subscribe to session updates
- `leave_session` - Unsubscribe from session
- `send_feedback` - Submit feedback (alternative to REST)
- `request_finish` - Request immediate completion

**Server → Client:**
- `session_status` - Session status changed
- `iteration_started` - New research iteration beginning
- `iteration_complete` - Iteration finished, awaiting feedback
- `plan_created` - Research plan ready
- `plan_updated` - Plan modified based on feedback
- `agent_spawned` - New agent started
- `agent_status` - Agent status update
- `agent_progress` - Agent progress percentage
- `finding_added` - New finding discovered
- `knowledge_updated` - Knowledge base changed
- `synthesis_started` - Synthesis beginning
- `synthesis_chunk` - Streaming synthesis content
- `synthesis_complete` - Synthesis finished
- `feedback_processed` - User feedback acknowledged
- `research_complete` - Final results ready
- `error` - Error occurred

---

## Database Schema

```sql
-- Sessions
CREATE TABLE research_sessions (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  status TEXT NOT NULL,
  current_iteration INTEGER DEFAULT 0,
  config JSON NOT NULL,
  prompt_config JSON,
  exit_criteria JSON,
  plan JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_subtopic TEXT,
  custom_prompt TEXT,
  started_at DATETIME,
  completed_at DATETIME
);

-- Knowledge Entries (unified knowledge storage)
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  agent_id TEXT REFERENCES agents(id),
  iteration INTEGER NOT NULL,

  -- Content
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT,
  tags JSON,

  -- Quality metrics
  confidence REAL,
  relevance REAL,
  novelty REAL,

  -- Relationships (JSON arrays of entry IDs)
  related_entries JSON,
  contradicts JSON,
  supports JSON,

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id TEXT,
  merged_from JSON,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sources (linked to knowledge entries)
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES knowledge_entries(id),
  url TEXT NOT NULL,
  title TEXT,
  excerpt TEXT,
  full_content TEXT,
  reliability REAL,
  accessed_at DATETIME,
  published_at DATETIME
);

-- Synthesis (one per iteration + final)
CREATE TABLE syntheses (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  iteration INTEGER,
  is_final BOOLEAN DEFAULT FALSE,
  summary TEXT NOT NULL,
  key_findings JSON NOT NULL,
  sections JSON NOT NULL,
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Feedback
CREATE TABLE user_feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  iteration INTEGER NOT NULL,
  type TEXT NOT NULL,  -- 'guidance', 'approval', 'stop', 'redirect'
  content TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Gaps (identified by orchestrator)
CREATE TABLE knowledge_gaps (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  iteration INTEGER NOT NULL,
  subtopic TEXT,
  description TEXT NOT NULL,
  priority TEXT,  -- 'high', 'medium', 'low'
  suggested_queries JSON,
  resolved BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent Messages (for debugging/audit)
CREATE TABLE agent_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  iteration INTEGER,
  from_agent TEXT,
  to_agent TEXT,
  type TEXT NOT NULL,
  payload JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Saved Prompts (user customizations)
CREATE TABLE saved_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agent_type TEXT NOT NULL,  -- 'orchestrator', 'researcher', 'synthesizer'
  prompt_text TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_knowledge_session ON knowledge_entries(session_id);
CREATE INDEX idx_knowledge_agent ON knowledge_entries(agent_id);
CREATE INDEX idx_knowledge_iteration ON knowledge_entries(session_id, iteration);
CREATE INDEX idx_sources_entry ON sources(entry_id);
CREATE INDEX idx_feedback_session ON user_feedback(session_id);
CREATE INDEX idx_gaps_session ON knowledge_gaps(session_id);
```

---

## Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database (SQLite for local, PostgreSQL for production)
DATABASE_URL=file:./data/deep-search.db
# DATABASE_URL=postgresql://user:pass@localhost:5432/deep_search

# LLM Provider (only external API dependency - optional if using local)
LLM_PROVIDER=openai-compat  # openrouter | openai-compat
LLM_BASE_URL=http://localhost:11434/v1  # Ollama default
LLM_API_KEY=optional-for-local
LLM_MODEL=llama3.2

# Web Search (self-hosted - no external APIs)
SEARCH_PROVIDER=searxng  # searxng | scraper
SEARXNG_URL=http://localhost:8080

# Scraper Settings
SCRAPER_TIMEOUT=30000
SCRAPER_MAX_CONCURRENT=5
SCRAPER_USER_AGENT=DeepSearch/1.0

# Research Defaults
DEFAULT_MAX_AGENTS=3
DEFAULT_MAX_SEARCHES_PER_AGENT=5
DEFAULT_DEPTH_LEVEL=medium
```

---

## Local Deployment Options

All deployments are fully self-contained with no external API dependencies (except optional cloud LLM).

### Option 1: Minimal (SQLite + Ollama + Built-in Scraper)

No Docker required for search - uses built-in Playwright scraper.

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/deep-search.db
      - LLM_PROVIDER=openai-compat
      - LLM_BASE_URL=http://host.docker.internal:11434/v1
      - SEARCH_PROVIDER=scraper  # Built-in, no external service needed
    volumes:
      - ./data:/app/data

# Run Ollama separately on host: ollama serve
```

### Option 2: Full Stack (SQLite + Ollama + SearXNG)

Better search quality with self-hosted SearXNG meta-search.

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/deep-search.db
      - LLM_PROVIDER=openai-compat
      - LLM_BASE_URL=http://host.docker.internal:11434/v1
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

# Run Ollama separately on host: ollama serve
```

### Option 3: Production (PostgreSQL + Ollama + SearXNG + Redis)

Full self-hosted production deployment.

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/deep_search
      - LLM_PROVIDER=openai-compat
      - LLM_BASE_URL=http://ollama:11434/v1
      - SEARCH_PROVIDER=searxng
      - SEARXNG_URL=http://searxng:8080
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - ollama
      - searxng
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: deep_search
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  searxng:
    image: searxng/searxng
    volumes:
      - ./searxng:/etc/searxng

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  ollama_data:
  redis_data:
```

### SearXNG Configuration

Create `searxng/settings.yml` for optimal research results:

```yaml
general:
  instance_name: "Deep Search"

search:
  safe_search: 0
  default_lang: "en"

engines:
  - name: google
    engine: google
    disabled: false
  - name: bing
    engine: bing
    disabled: false
  - name: duckduckgo
    engine: duckduckgo
    disabled: false
  - name: wikipedia
    engine: wikipedia
    disabled: false
  - name: arxiv
    engine: arxiv
    disabled: false

server:
  secret_key: "change-this-in-production"

outgoing:
  request_timeout: 10.0
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Project setup with monorepo structure
- [ ] Shared types package
- [ ] Database setup with migrations
- [ ] LLM provider abstraction + implementations
- [ ] Search provider abstraction + implementations

### Phase 2: Agent System
- [ ] Message bus implementation
- [ ] Base agent class
- [ ] Agent pool management
- [ ] WebSocket handler for real-time updates

### Phase 3: Deep Research Module
- [ ] Orchestrator agent with planning logic
- [ ] Researcher agent with search + analysis
- [ ] Synthesizer agent for results compilation
- [ ] REST API endpoints
- [ ] Session management

### Phase 4: Frontend
- [ ] Project setup with Vite + React + Tailwind
- [ ] shadcn/ui component installation
- [ ] Research input and configuration UI
- [ ] Real-time agent status display
- [ ] Results and synthesis view
- [ ] WebSocket integration

### Phase 5: Polish
- [ ] Error handling and recovery
- [ ] Export functionality (Markdown, PDF)
- [ ] Session history and management
- [ ] Configuration UI
- [ ] Documentation

---

## Future Modules (Extensibility)

The modular architecture allows adding new capabilities:

- **Document Analysis Module** - Upload and analyze documents
- **Comparison Module** - Compare multiple topics side-by-side
- **Fact Checking Module** - Verify claims against sources
- **Summarization Module** - Summarize long documents or URLs
- **Citation Module** - Generate properly formatted citations
