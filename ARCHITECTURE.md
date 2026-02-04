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

### Research Flow

```
1. User enters research topic
                │
                ▼
2. Orchestrator Agent receives topic
   ├── Analyzes topic complexity
   ├── Creates research plan with subtopics
   └── Determines number of researcher agents needed
                │
                ▼
3. Orchestrator spawns Researcher Agents
   └── Each agent assigned specific subtopics/angles
                │
                ▼
4. Researcher Agents work in parallel
   ├── Execute web searches
   ├── Analyze results with LLM
   ├── Extract key findings
   └── Report findings to Orchestrator
                │
                ▼
5. Orchestrator evaluates findings
   ├── Determines if clarification needed → asks agent to clarify
   ├── Determines if more research needed → asks agent to expand
   └── Collects sufficient findings → triggers synthesis
                │
                ▼
6. Synthesizer Agent
   ├── Aggregates all findings
   ├── Identifies key themes and conflicts
   ├── Generates comprehensive summary
   └── Creates structured report with citations
                │
                ▼
7. Results displayed to user with real-time updates throughout
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
}
```

---

## Data Models

### Research Session

```typescript
interface ResearchSession {
  id: string;
  topic: string;
  status: 'planning' | 'researching' | 'synthesizing' | 'completed' | 'error';
  config: {
    maxAgents: number;
    maxSearchesPerAgent: number;
    depthLevel: 'shallow' | 'medium' | 'deep';
  };
  plan?: ResearchPlan;
  agents: AgentState[];
  findings: Finding[];
  synthesis?: Synthesis;
  createdAt: Date;
  completedAt?: Date;
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

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/research/sessions` | Start new research session |
| GET | `/api/research/sessions` | List all sessions |
| GET | `/api/research/sessions/:id` | Get session details |
| DELETE | `/api/research/sessions/:id` | Cancel session |
| GET | `/api/research/sessions/:id/findings` | Get all findings |
| GET | `/api/research/sessions/:id/synthesis` | Get synthesis |
| POST | `/api/research/sessions/:id/expand` | Request more research |
| GET | `/api/research/sessions/:id/export` | Export results |

### WebSocket Events

**Client → Server:**
- `join_session` - Subscribe to session updates
- `leave_session` - Unsubscribe from session

**Server → Client:**
- `session_status` - Session status changed
- `plan_created` - Research plan ready
- `agent_spawned` - New agent started
- `agent_status` - Agent status update
- `finding_added` - New finding discovered
- `synthesis_progress` - Synthesis in progress
- `synthesis_complete` - Research complete

---

## Database Schema

```sql
-- Sessions
CREATE TABLE research_sessions (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  status TEXT NOT NULL,
  config JSON NOT NULL,
  plan JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_subtopic TEXT,
  started_at DATETIME,
  completed_at DATETIME
);

-- Findings
CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  agent_id TEXT REFERENCES agents(id),
  content TEXT NOT NULL,
  sources JSON NOT NULL,
  confidence REAL,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Synthesis
CREATE TABLE synthesis (
  id TEXT PRIMARY KEY,
  session_id TEXT UNIQUE REFERENCES research_sessions(id),
  summary TEXT NOT NULL,
  key_findings JSON NOT NULL,
  sections JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent Messages (for debugging/audit)
CREATE TABLE agent_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES research_sessions(id),
  from_agent TEXT,
  to_agent TEXT,
  type TEXT NOT NULL,
  payload JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
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
