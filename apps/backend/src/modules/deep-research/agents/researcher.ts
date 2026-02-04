import type {
  AgentConfig,
  AgentMessage,
  KnowledgeEntry,
  MessageType,
  AssignTaskPayload,
  FindingReportPayload,
} from '@deep-search/shared';
import { generateId, MessageType as MT } from '@deep-search/shared';
import { BaseAgent } from '../../../core/agents/base-agent.js';
import { getLLMProvider, type LLMProvider } from '../../../core/llm/index.js';
import { getSearchProvider, getScraper, type SearchProvider, type WebScraper } from '../../../core/search/index.js';
import { RESEARCHER_SYSTEM_PROMPT, ANALYZE_RESULTS_PROMPT } from '../prompts/researcher.js';

interface ResearcherConfig extends AgentConfig {
  maxSearches?: number;
}

interface AnalyzedFinding {
  content: string;
  summary: string;
  confidence: number;
  relevance: number;
  sources: Array<{
    url: string;
    title: string;
    excerpt: string;
    reliability: number;
  }>;
  tags: string[];
}

interface AnalysisResult {
  findings: AnalyzedFinding[];
  suggestedFollowUp: string[];
  gaps: string[];
}

export class ResearcherAgent extends BaseAgent {
  private llm: LLMProvider;
  private searchProvider: SearchProvider;
  private scraper: WebScraper;
  private maxSearches: number;
  private currentIteration = 0;
  private findings: KnowledgeEntry[] = [];
  private searchQueries: string[] = [];

  constructor(config: ResearcherConfig) {
    super({ ...config, role: 'researcher' });
    this.llm = getLLMProvider();
    this.searchProvider = getSearchProvider();
    this.scraper = getScraper();
    this.maxSearches = config.maxSearches || 5;
  }

  async run(): Promise<void> {
    // Researcher waits for tasks from orchestrator
    this.updateStatus('waiting');
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MT.ASSIGN_TASK:
        await this.handleAssignTask(message as AgentMessage<AssignTaskPayload>);
        break;
      case MT.REQUEST_CLARIFICATION:
        await this.handleClarification(message);
        break;
      case MT.EXPAND_RESEARCH:
        await this.handleExpand(message);
        break;
      case MT.STOP_RESEARCH:
        await this.stop();
        break;
    }
  }

  private async handleAssignTask(message: AgentMessage<AssignTaskPayload>): Promise<void> {
    const { subtopic, searchQueries, instructions } = message.payload;
    this.assignedSubtopic = subtopic;
    this.searchQueries = searchQueries;
    this.currentIteration = message.iteration;

    this.updateStatus('searching');
    this.updateProgress(0, `Researching: ${subtopic}`);

    try {
      const findings = await this.executeResearch(subtopic, searchQueries);
      this.findings.push(...findings);

      // Report findings to orchestrator
      await this.reportFindings(findings, message.from);

      this.updateStatus('completed');
      this.updateProgress(100, 'Research complete');
    } catch (error) {
      this.setError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async executeResearch(subtopic: string, queries: string[]): Promise<KnowledgeEntry[]> {
    const allFindings: KnowledgeEntry[] = [];
    const totalQueries = Math.min(queries.length, this.maxSearches);

    for (let i = 0; i < totalQueries; i++) {
      const query = queries[i];
      const progress = ((i + 1) / totalQueries) * 100;
      this.updateProgress(progress * 0.5, `Searching: ${query}`);

      try {
        // Execute search
        const searchResults = await this.searchProvider.search(query, { maxResults: 5 });

        if (searchResults.length === 0) {
          continue;
        }

        this.updateProgress(progress * 0.6, `Analyzing results for: ${query}`);

        // Fetch top 3 pages for detailed content
        const topUrls = searchResults.slice(0, 3).map(r => r.url);
        const pageContents = await Promise.all(
          topUrls.map(async (url) => {
            try {
              return await this.searchProvider.fetchPage(url);
            } catch {
              return null;
            }
          })
        );

        const validPages = pageContents.filter((p): p is NonNullable<typeof p> => p !== null);

        // Analyze results with LLM
        const analysis = await this.analyzeResults(subtopic, query, searchResults, validPages);

        // Convert to knowledge entries
        for (const finding of analysis.findings) {
          const entry: KnowledgeEntry = {
            id: generateId(),
            sessionId: this.sessionId,
            agentId: this.id,
            iteration: this.currentIteration,
            content: finding.content,
            summary: finding.summary,
            category: subtopic,
            tags: finding.tags,
            confidence: finding.confidence,
            relevance: finding.relevance,
            novelty: 1.0, // Will be calculated by orchestrator
            relatedEntries: [],
            contradicts: [],
            supports: [],
            version: 1,
            createdAt: new Date(),
          };

          allFindings.push(entry);
        }
      } catch (error) {
        console.error(`Error researching query "${query}":`, error);
      }
    }

    return allFindings;
  }

  private async analyzeResults(
    subtopic: string,
    query: string,
    searchResults: Array<{ title: string; url: string; snippet: string }>,
    pageContents: Array<{ url: string; title: string; content: string; markdown: string }>
  ): Promise<AnalysisResult> {
    const searchResultsText = searchResults
      .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`)
      .join('\n\n');

    const pageContentText = pageContents
      .map((p) => `### ${p.title} (${p.url})\n${p.content.slice(0, 2000)}...`)
      .join('\n\n---\n\n');

    const prompt = ANALYZE_RESULTS_PROMPT
      .replace('{subtopic}', subtopic)
      .replace('{query}', query)
      .replace('{searchResults}', searchResultsText)
      .replace('{pageContent}', pageContentText);

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: this.customPrompt || RESEARCHER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    try {
      // Extract JSON from response (handle potential markdown code blocks)
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      return JSON.parse(jsonStr.trim()) as AnalysisResult;
    } catch {
      console.error('Failed to parse LLM response:', response.content);
      return { findings: [], suggestedFollowUp: [], gaps: [] };
    }
  }

  private async reportFindings(findings: KnowledgeEntry[], orchestratorId: string): Promise<void> {
    const payload: FindingReportPayload = {
      findings: findings.map((f) => ({
        content: f.content,
        sources: f.tags.map((tag) => ({
          url: tag,
          title: '',
          snippet: '',
          relevanceScore: f.relevance,
        })),
        confidence: f.confidence,
        category: f.category,
      })),
    };

    await this.sendMessage(orchestratorId, MT.FINDING_REPORT, payload, this.currentIteration);
  }

  private async handleClarification(message: AgentMessage): Promise<void> {
    // Handle clarification requests
    this.updateStatus('analyzing');
    // Implementation for clarification...
    await this.sendMessage(
      message.from,
      MT.CLARIFICATION_RESPONSE,
      { clarified: true },
      message.iteration
    );
  }

  private async handleExpand(message: AgentMessage): Promise<void> {
    // Handle expansion requests
    const payload = message.payload as { additionalQueries: string[] };
    if (payload.additionalQueries) {
      this.searchQueries.push(...payload.additionalQueries);
      await this.executeResearch(this.assignedSubtopic || 'general', payload.additionalQueries);
    }
  }

  getFindings(): KnowledgeEntry[] {
    return [...this.findings];
  }
}
