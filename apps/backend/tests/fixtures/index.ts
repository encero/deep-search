import type {
  ChatRequest,
  ChatResponse,
  SearchResult,
  ScrapedContent,
  ResearchSession,
  ResearchConfig,
  LoopExitCriteria,
  KnowledgeEntry,
  Synthesis,
  AgentState,
} from '@deep-search/shared';

// LLM Fixtures
export const mockChatRequest: ChatRequest = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello, how are you?' },
  ],
  temperature: 0.7,
  maxTokens: 1000,
};

export const mockChatResponse: ChatResponse = {
  content: 'I am doing well, thank you for asking!',
  model: 'test-model',
  usage: {
    promptTokens: 20,
    completionTokens: 10,
    totalTokens: 30,
  },
  finishReason: 'stop',
};

export const mockOpenAIChatResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'test-model',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'I am doing well, thank you for asking!',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 20,
    completion_tokens: 10,
    total_tokens: 30,
  },
};

export const mockStreamChunks = [
  'data: {"id":"1","choices":[{"delta":{"content":"Hello"}}]}\n\n',
  'data: {"id":"1","choices":[{"delta":{"content":" world"}}]}\n\n',
  'data: {"id":"1","choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
  'data: [DONE]\n\n',
];

// Search Fixtures
export const mockSearchResults: SearchResult[] = [
  {
    title: 'Introduction to Machine Learning',
    url: 'https://example.com/ml-intro',
    snippet: 'Machine learning is a subset of artificial intelligence...',
    source: 'example.com',
  },
  {
    title: 'Deep Learning Fundamentals',
    url: 'https://example.org/deep-learning',
    snippet: 'Deep learning uses neural networks with multiple layers...',
    source: 'example.org',
  },
  {
    title: 'AI Applications in Healthcare',
    url: 'https://health.example.com/ai',
    snippet: 'Artificial intelligence is transforming healthcare...',
    source: 'health.example.com',
  },
];

export const mockScrapedContent: ScrapedContent = {
  url: 'https://example.com/article',
  title: 'Sample Article Title',
  content: 'This is the main content of the article. It contains important information about the topic.',
  markdown: '# Sample Article Title\n\nThis is the main content of the article.',
  links: ['https://example.com/related1', 'https://example.com/related2'],
  metadata: {
    author: 'John Doe',
    publishedDate: '2024-01-15',
    description: 'A sample article for testing purposes.',
  },
};

export const mockHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <meta name="description" content="Test description">
  <meta name="author" content="Test Author">
</head>
<body>
  <article>
    <h1>Main Heading</h1>
    <p>This is the first paragraph with important content.</p>
    <p>This is the second paragraph with more details.</p>
    <a href="/link1">Link 1</a>
    <a href="https://external.com/link2">External Link</a>
  </article>
</body>
</html>
`;

// Research Session Fixtures
export const mockResearchConfig: ResearchConfig = {
  maxAgents: 3,
  maxSearchesPerAgent: 5,
  depthLevel: 'medium',
  focusAreas: ['technical details'],
  excludeTopics: ['pricing'],
};

export const mockExitCriteria: LoopExitCriteria = {
  maxIterations: 10,
  maxDurationMinutes: 30,
  minConfidenceScore: 0.7,
  saturationThreshold: 0.1,
  requiredSubtopicCoverage: 0.8,
};

export const mockResearchSession: ResearchSession = {
  id: 'session-123',
  topic: 'Machine Learning Applications',
  status: 'researching',
  config: mockResearchConfig,
  exitCriteria: mockExitCriteria,
  currentIteration: 2,
  plan: {
    mainTopic: 'Machine Learning Applications',
    strategy: 'Comprehensive research across multiple domains',
    subtopics: [
      {
        id: 'sub-1',
        title: 'Healthcare ML',
        description: 'ML applications in healthcare',
        searchQueries: ['machine learning healthcare', 'AI medical diagnosis'],
      },
      {
        id: 'sub-2',
        title: 'Finance ML',
        description: 'ML applications in finance',
        searchQueries: ['machine learning finance', 'AI trading'],
      },
    ],
  },
  agents: [],
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
};

export const mockAgentState: AgentState = {
  id: 'agent-123',
  sessionId: 'session-123',
  role: 'researcher',
  status: 'searching',
  assignedSubtopic: 'Healthcare ML',
  progress: 50,
  currentTask: 'Searching for ML healthcare applications',
  startedAt: new Date('2024-01-15T10:05:00Z'),
};

export const mockKnowledgeEntry: KnowledgeEntry = {
  id: 'entry-123',
  sessionId: 'session-123',
  agentId: 'agent-123',
  iteration: 1,
  content: 'Machine learning is being used to detect diseases from medical images with high accuracy.',
  summary: 'ML for medical image analysis',
  category: 'Healthcare ML',
  tags: ['healthcare', 'image-analysis', 'diagnosis'],
  confidence: 0.85,
  relevance: 0.9,
  novelty: 0.7,
  relatedEntries: [],
  contradicts: [],
  supports: [],
  version: 1,
  createdAt: new Date('2024-01-15T10:10:00Z'),
};

export const mockSynthesis: Synthesis = {
  id: 'synthesis-123',
  sessionId: 'session-123',
  iteration: 2,
  isFinal: false,
  summary: 'Machine learning has significant applications across healthcare and finance sectors.',
  keyFindings: [
    {
      title: 'Medical Imaging Advancement',
      description: 'ML models can detect diseases from medical images with 95%+ accuracy.',
      importance: 'high',
      sources: ['https://example.com/medical-ai'],
    },
    {
      title: 'Algorithmic Trading Growth',
      description: 'ML-powered trading systems now handle 60% of market transactions.',
      importance: 'medium',
      sources: ['https://example.com/finance-ai'],
    },
  ],
  sections: [
    {
      title: 'Healthcare Applications',
      content: 'Detailed analysis of ML in healthcare...',
      sources: ['https://example.com/medical-ai'],
    },
  ],
  confidence: 0.8,
  createdAt: new Date('2024-01-15T10:30:00Z'),
};

// LLM Response Fixtures for Agents
export const mockPlanningResponse = {
  mainTopic: 'Test Topic',
  strategy: 'Comprehensive research',
  subtopics: [
    {
      id: 'sub-1',
      title: 'Subtopic 1',
      description: 'Description 1',
      searchQueries: ['query 1', 'query 2'],
    },
  ],
};

export const mockAnalysisResponse = {
  findings: [
    {
      content: 'Important finding about the topic',
      summary: 'Finding summary',
      confidence: 0.8,
      relevance: 0.9,
      sources: [
        {
          url: 'https://example.com',
          title: 'Source Title',
          excerpt: 'Relevant excerpt',
          reliability: 0.85,
        },
      ],
      tags: ['tag1', 'tag2'],
    },
  ],
  suggestedFollowUp: ['follow-up query 1'],
  gaps: ['identified gap'],
};

export const mockSynthesisResponse = {
  summary: 'Comprehensive summary of research findings',
  keyFindings: [
    {
      title: 'Key Finding 1',
      description: 'Description of the finding',
      importance: 'high' as const,
      sources: ['https://example.com'],
    },
  ],
  sections: [
    {
      title: 'Section 1',
      content: 'Section content',
      sources: ['https://example.com'],
    },
  ],
  confidence: 0.85,
};
