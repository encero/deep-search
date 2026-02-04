import type {
  AgentConfig,
  AgentMessage,
  ResearchPlan,
  SubtopicPlan,
  KnowledgeEntry,
  Synthesis,
  Theme,
  Contradiction,
  KnowledgeGap,
  UserFeedback,
  LoopExitCriteria,
  ResearchConfig,
  AgentPromptConfig,
  FindingReportPayload,
  SynthesisCompletePayload,
  UserFeedbackPayload,
} from '@deep-search/shared';
import {
  generateId,
  MessageType as MT,
  DEFAULT_EXIT_CRITERIA,
} from '@deep-search/shared';
import { BaseAgent } from '../../../core/agents/base-agent.js';
import { getAgentPool } from '../../../core/agents/agent-pool.js';
import { getLLMProvider, type LLMProvider } from '../../../core/llm/index.js';
import { ResearcherAgent } from './researcher.js';
import { SynthesizerAgent } from './synthesizer.js';
import {
  ORCHESTRATOR_SYSTEM_PROMPT,
  PLANNING_PROMPT,
  EVALUATION_PROMPT,
  MERGE_FINDINGS_PROMPT,
} from '../prompts/orchestrator.js';
import { EventEmitter } from 'events';

interface OrchestratorConfig extends AgentConfig {
  topic: string;
  researchConfig: ResearchConfig;
  promptConfig?: AgentPromptConfig;
  exitCriteria?: LoopExitCriteria;
}

interface EvaluationResult {
  decision: 'continue' | 'synthesize' | 'expand';
  confidence: number;
  reasoning: string;
  newSubtopics?: SubtopicPlan[];
  focusAreas?: string[];
}

interface MergeResult {
  keyThemes: Theme[];
  contradictions: Contradiction[];
  gaps: KnowledgeGap[];
  overallConfidence: number;
}

export interface OrchestratorEvents {
  planCreated: (plan: ResearchPlan) => void;
  iterationStarted: (iteration: number) => void;
  iterationComplete: (iteration: number, findingsCount: number) => void;
  synthesisStarted: (iteration: number, isFinal: boolean) => void;
  synthesisComplete: (synthesis: Synthesis) => void;
  researchComplete: (synthesis: Synthesis) => void;
  error: (error: Error) => void;
}

export class OrchestratorAgent extends BaseAgent {
  private llm: LLMProvider;
  private topic: string;
  private researchConfig: ResearchConfig;
  private promptConfig?: AgentPromptConfig;
  private exitCriteria: LoopExitCriteria;

  private plan?: ResearchPlan;
  private currentIteration = 0;
  private allFindings: KnowledgeEntry[] = [];
  private themes: Theme[] = [];
  private contradictions: Contradiction[] = [];
  private gaps: KnowledgeGap[] = [];
  private syntheses: Synthesis[] = [];
  private feedbackQueue: UserFeedback[] = [];
  private researcherAgents: ResearcherAgent[] = [];
  private synthesizerAgent?: SynthesizerAgent;
  private isRunning = false;
  private startTime?: Date;

  constructor(config: OrchestratorConfig) {
    super({ ...config, role: 'orchestrator' });
    this.llm = getLLMProvider();
    this.topic = config.topic;
    this.researchConfig = config.researchConfig;
    this.promptConfig = config.promptConfig;
    this.exitCriteria = config.exitCriteria || DEFAULT_EXIT_CRITERIA;
  }

  async run(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = new Date();
    this.updateStatus('planning');

    try {
      // Phase 1: Create research plan
      this.updateProgress(5, 'Creating research plan...');
      this.plan = await this.createPlan();
      this.emit('planCreated', this.plan);

      // Create synthesizer agent
      this.synthesizerAgent = new SynthesizerAgent({
        id: generateId(),
        role: 'synthesizer',
        sessionId: this.sessionId,
        topic: this.topic,
        depthLevel: this.researchConfig.depthLevel,
        outputStyle: this.promptConfig?.outputTone || 'formal',
        customInstructions: this.promptConfig?.synthesizerInstructions,
      });
      await getAgentPool().addAgent(this.synthesizerAgent);

      // Phase 2: Research loop
      while (this.shouldContinue()) {
        this.currentIteration++;
        this.emit('iterationStarted', this.currentIteration);
        this.updateStatus('researching');

        // Spawn and run researcher agents
        await this.executeResearchIteration();

        // Process any pending user feedback
        await this.processFeedback();

        // Merge findings
        const mergeResult = await this.mergeFindings();
        this.themes = mergeResult.keyThemes;
        this.contradictions = mergeResult.contradictions;
        this.updateGaps(mergeResult.gaps);

        // Generate incremental synthesis
        this.emit('synthesisStarted', this.currentIteration, false);
        const synthesis = await this.synthesizerAgent!.synthesize({
          findings: this.allFindings,
          themes: this.themes,
          contradictions: this.contradictions,
          gaps: this.gaps,
          previousSynthesis: this.syntheses[this.syntheses.length - 1],
          iteration: this.currentIteration,
          isFinal: false,
        });
        this.syntheses.push(synthesis);
        this.emit('synthesisComplete', synthesis);

        this.emit('iterationComplete', this.currentIteration, this.allFindings.length);

        // Evaluate and decide next steps
        const evaluation = await this.evaluateProgress();
        if (evaluation.decision === 'synthesize') {
          break;
        }

        if (evaluation.decision === 'expand' && evaluation.newSubtopics) {
          this.plan!.subtopics.push(...evaluation.newSubtopics);
        }
      }

      // Phase 3: Final synthesis
      this.updateStatus('synthesizing');
      this.emit('synthesisStarted', this.currentIteration, true);
      this.updateProgress(90, 'Generating final synthesis...');

      const finalSynthesis = await this.synthesizerAgent!.synthesize({
        findings: this.allFindings,
        themes: this.themes,
        contradictions: this.contradictions,
        gaps: this.gaps,
        iteration: this.currentIteration,
        isFinal: true,
      });

      this.syntheses.push(finalSynthesis);
      this.emit('synthesisComplete', finalSynthesis);
      this.emit('researchComplete', finalSynthesis);

      this.updateStatus('completed');
      this.updateProgress(100, 'Research complete');
    } catch (error) {
      this.setError(error instanceof Error ? error : new Error(String(error)));
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isRunning = false;
    }
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MT.FINDING_REPORT:
        await this.handleFindingReport(message as AgentMessage<FindingReportPayload>);
        break;
      case MT.SYNTHESIS_COMPLETE:
        // Handled internally
        break;
      case MT.USER_FEEDBACK:
        await this.handleUserFeedback(message as AgentMessage<UserFeedbackPayload>);
        break;
      case MT.USER_STOP_REQUEST:
        this.exitCriteria.maxIterations = this.currentIteration;
        break;
    }
  }

  private async createPlan(): Promise<ResearchPlan> {
    const subtopicCount = this.getSubtopicCount();

    const prompt = PLANNING_PROMPT
      .replace('{topic}', this.topic)
      .replace('{focusAreas}', this.researchConfig.focusAreas?.join(', ') || 'None specified')
      .replace('{excludeTopics}', this.researchConfig.excludeTopics?.join(', ') || 'None specified')
      .replace('{depthLevel}', this.researchConfig.depthLevel)
      .replace('{customInstructions}', this.promptConfig?.orchestratorInstructions || 'None')
      .replace('{subtopicCount}', String(subtopicCount));

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: this.customPrompt || ORCHESTRATOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    try {
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      return JSON.parse(jsonStr.trim()) as ResearchPlan;
    } catch {
      console.error('Failed to parse plan:', response.content);
      // Create a basic plan if parsing fails
      return {
        mainTopic: this.topic,
        strategy: 'General research approach',
        subtopics: [
          {
            id: generateId(),
            title: this.topic,
            description: `Research the main topic: ${this.topic}`,
            searchQueries: [this.topic, `${this.topic} overview`, `${this.topic} explained`],
          },
        ],
      };
    }
  }

  private async executeResearchIteration(): Promise<void> {
    const agentPool = getAgentPool();
    const pendingSubtopics = this.plan!.subtopics.filter(
      (s) => !s.status || s.status === 'pending'
    );

    const subtopicsToResearch = pendingSubtopics.slice(0, this.researchConfig.maxAgents);
    const researchPromises: Promise<void>[] = [];

    // Clean up previous researcher agents
    for (const agent of this.researcherAgents) {
      await agentPool.removeAgent(agent.id);
    }
    this.researcherAgents = [];

    // Spawn new researcher agents
    for (const subtopic of subtopicsToResearch) {
      subtopic.status = 'in_progress';

      const researcher = new ResearcherAgent({
        id: generateId(),
        role: 'researcher',
        sessionId: this.sessionId,
        assignedSubtopic: subtopic.title,
        maxSearches: this.researchConfig.maxSearchesPerAgent,
        customPrompt: this.promptConfig?.researcherPrompt,
      });

      this.researcherAgents.push(researcher);
      await agentPool.addAgent(researcher);

      // Send task to researcher
      const promise = (async () => {
        await this.sendMessage(
          researcher.id,
          MT.ASSIGN_TASK,
          {
            subtopic: subtopic.title,
            searchQueries: subtopic.searchQueries,
            instructions: this.promptConfig?.researcherInstructions,
          },
          this.currentIteration
        );

        // Wait for researcher to complete
        await new Promise<void>((resolve) => {
          researcher.on('complete', () => {
            subtopic.status = 'completed';
            const findings = researcher.getFindings();
            this.allFindings.push(...findings);
            resolve();
          });
          researcher.on('error', () => {
            subtopic.status = 'completed';
            resolve();
          });
        });
      })();

      researchPromises.push(promise);
    }

    await Promise.all(researchPromises);
  }

  private async mergeFindings(): Promise<MergeResult> {
    if (this.allFindings.length === 0) {
      return {
        keyThemes: [],
        contradictions: [],
        gaps: [],
        overallConfidence: 0,
      };
    }

    const findingsText = this.allFindings
      .map((f, i) => `[${f.id}] ${f.category}: ${f.content} (confidence: ${f.confidence})`)
      .join('\n');

    const prompt = MERGE_FINDINGS_PROMPT
      .replace('{topic}', this.topic)
      .replace('{findings}', findingsText);

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    try {
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      const result = JSON.parse(jsonStr.trim());
      return {
        keyThemes: result.keyThemes.map((t: any) => ({
          id: generateId(),
          title: t.title,
          description: t.description,
          supportingEntries: t.supportingFindings || [],
          strength: t.strength,
        })),
        contradictions: result.contradictions.map((c: any) => ({
          id: generateId(),
          description: c.description,
          entries: c.findings || [],
          resolved: false,
        })),
        gaps: result.gaps.map((g: any) => ({
          id: generateId(),
          sessionId: this.sessionId,
          iteration: this.currentIteration,
          subtopic: g.subtopic,
          description: g.description,
          priority: g.priority,
          suggestedQueries: g.suggestedQueries || [],
          resolved: false,
          createdAt: new Date(),
        })),
        overallConfidence: result.overallConfidence,
      };
    } catch {
      return {
        keyThemes: [],
        contradictions: [],
        gaps: [],
        overallConfidence: 0.5,
      };
    }
  }

  private async evaluateProgress(): Promise<EvaluationResult> {
    const subtopicsCoverage = this.plan!.subtopics
      .map((s) => `${s.title}: ${s.status || 'pending'}`)
      .join('\n');

    const findingsSummary = this.allFindings.length > 0
      ? `${this.allFindings.length} findings collected with average confidence ${
          this.allFindings.reduce((sum, f) => sum + f.confidence, 0) / this.allFindings.length
        }`
      : 'No findings yet';

    const gapsText = this.gaps
      .filter((g) => !g.resolved)
      .map((g) => `[${g.priority}] ${g.description}`)
      .join('\n') || 'None';

    const userFeedback = this.feedbackQueue.length > 0
      ? this.feedbackQueue.map((f) => f.content).join('; ')
      : 'None';

    const prompt = EVALUATION_PROMPT
      .replace('{topic}', this.topic)
      .replace('{iteration}', String(this.currentIteration))
      .replace('{maxIterations}', String(this.exitCriteria.maxIterations))
      .replace('{subtopicsCoverage}', subtopicsCoverage)
      .replace('{findingsSummary}', findingsSummary)
      .replace('{gaps}', gapsText)
      .replace('{userFeedback}', userFeedback);

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    try {
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      return JSON.parse(jsonStr.trim()) as EvaluationResult;
    } catch {
      return {
        decision: 'continue',
        confidence: 0.5,
        reasoning: 'Unable to evaluate, continuing by default',
      };
    }
  }

  private shouldContinue(): boolean {
    // Check max iterations
    if (this.currentIteration >= this.exitCriteria.maxIterations) {
      return false;
    }

    // Check time limit
    if (this.startTime) {
      const elapsedMinutes = (Date.now() - this.startTime.getTime()) / 60000;
      if (elapsedMinutes >= this.exitCriteria.maxDurationMinutes) {
        return false;
      }
    }

    // Check if all subtopics are completed
    const completedSubtopics = this.plan?.subtopics.filter((s) => s.status === 'completed').length || 0;
    const totalSubtopics = this.plan?.subtopics.length || 1;
    if (completedSubtopics >= totalSubtopics) {
      return false;
    }

    return true;
  }

  private async handleFindingReport(message: AgentMessage<FindingReportPayload>): Promise<void> {
    // Findings are already collected in executeResearchIteration
    // This handler is for any additional processing if needed
  }

  private async handleUserFeedback(message: AgentMessage<UserFeedbackPayload>): Promise<void> {
    const feedback: UserFeedback = {
      id: generateId(),
      sessionId: this.sessionId,
      iteration: this.currentIteration,
      timestamp: new Date(),
      type: message.payload.type,
      content: message.payload.content,
      processed: false,
    };

    this.feedbackQueue.push(feedback);

    if (feedback.type === 'stop') {
      this.exitCriteria.maxIterations = this.currentIteration;
    }
  }

  private async processFeedback(): Promise<void> {
    for (const feedback of this.feedbackQueue) {
      if (!feedback.processed) {
        feedback.processed = true;
        // Process feedback based on type
        if (feedback.type === 'redirect') {
          // Add new subtopic based on feedback
          this.plan?.subtopics.push({
            id: generateId(),
            title: feedback.content,
            description: `User requested focus on: ${feedback.content}`,
            searchQueries: [feedback.content],
          });
        }
      }
    }
  }

  private updateGaps(newGaps: KnowledgeGap[]): void {
    // Mark resolved gaps
    for (const existingGap of this.gaps) {
      const stillExists = newGaps.some(
        (g) => g.subtopic === existingGap.subtopic && g.description === existingGap.description
      );
      if (!stillExists) {
        existingGap.resolved = true;
      }
    }

    // Add new gaps
    for (const newGap of newGaps) {
      const exists = this.gaps.some(
        (g) => g.subtopic === newGap.subtopic && g.description === newGap.description
      );
      if (!exists) {
        this.gaps.push(newGap);
      }
    }
  }

  private getSubtopicCount(): number {
    switch (this.researchConfig.depthLevel) {
      case 'shallow':
        return 3;
      case 'deep':
        return 8;
      case 'medium':
      default:
        return 5;
    }
  }

  // Public getters
  getPlan(): ResearchPlan | undefined {
    return this.plan;
  }

  getFindings(): KnowledgeEntry[] {
    return [...this.allFindings];
  }

  getSyntheses(): Synthesis[] {
    return [...this.syntheses];
  }

  getLatestSynthesis(): Synthesis | undefined {
    return this.syntheses[this.syntheses.length - 1];
  }

  getCurrentIteration(): number {
    return this.currentIteration;
  }

  getGaps(): KnowledgeGap[] {
    return [...this.gaps];
  }

  addFeedback(feedback: UserFeedback): void {
    this.feedbackQueue.push(feedback);
  }

  requestStop(): void {
    this.exitCriteria.maxIterations = this.currentIteration;
  }
}
