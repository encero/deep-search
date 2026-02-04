import type {
  AgentConfig,
  AgentMessage,
  KnowledgeEntry,
  Synthesis,
  KeyFinding,
  SynthesisSection,
  Theme,
  Contradiction,
  KnowledgeGap,
  SynthesizeRequestPayload,
  SynthesisCompletePayload,
} from '@deep-search/shared';
import { generateId, MessageType as MT } from '@deep-search/shared';
import { BaseAgent } from '../../../core/agents/base-agent.js';
import { getLLMProvider, type LLMProvider } from '../../../core/llm/index.js';
import {
  SYNTHESIZER_SYSTEM_PROMPT,
  SYNTHESIS_PROMPT,
  INCREMENTAL_SYNTHESIS_PROMPT,
  FINAL_SYNTHESIS_PROMPT,
} from '../prompts/synthesizer.js';

interface SynthesizerConfig extends AgentConfig {
  topic: string;
  depthLevel?: string;
  outputStyle?: string;
  customInstructions?: string;
}

interface SynthesisInput {
  findings: KnowledgeEntry[];
  themes: Theme[];
  contradictions: Contradiction[];
  gaps: KnowledgeGap[];
  previousSynthesis?: Synthesis;
  iteration: number;
  isFinal: boolean;
}

interface LLMSynthesisResult {
  summary: string;
  keyFindings: Array<{
    title: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    sources: string[];
    confidence?: number;
  }>;
  sections: Array<{
    title: string;
    content: string;
    sources: string[];
  }>;
  confidence: number;
  limitations?: string[];
  conclusions?: string;
  recommendations?: string[];
  furtherResearch?: string[];
}

export class SynthesizerAgent extends BaseAgent {
  private llm: LLMProvider;
  private topic: string;
  private depthLevel: string;
  private outputStyle: string;
  private customInstructions?: string;
  private currentIteration = 0;
  private syntheses: Synthesis[] = [];

  constructor(config: SynthesizerConfig) {
    super({ ...config, role: 'synthesizer' });
    this.llm = getLLMProvider();
    this.topic = config.topic;
    this.depthLevel = config.depthLevel || 'medium';
    this.outputStyle = config.outputStyle || 'formal';
    this.customInstructions = config.customInstructions;
  }

  async run(): Promise<void> {
    // Synthesizer waits for requests from orchestrator
    this.updateStatus('waiting');
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MT.SYNTHESIZE_REQUEST:
        await this.handleSynthesizeRequest(message as AgentMessage<SynthesizeRequestPayload & SynthesisInput>);
        break;
      case MT.STOP_RESEARCH:
        await this.stop();
        break;
    }
  }

  async synthesize(input: SynthesisInput): Promise<Synthesis> {
    this.updateStatus('synthesizing');
    this.currentIteration = input.iteration;
    this.updateProgress(0, 'Starting synthesis...');

    try {
      const result = await this.generateSynthesis(input);

      const synthesis: Synthesis = {
        id: generateId(),
        sessionId: this.sessionId,
        iteration: input.iteration,
        isFinal: input.isFinal,
        summary: result.summary,
        keyFindings: result.keyFindings.map((f) => ({
          title: f.title,
          description: f.description,
          importance: f.importance,
          sources: f.sources,
        })),
        sections: result.sections.map((s) => ({
          title: s.title,
          content: s.content,
          sources: s.sources,
        })),
        confidence: result.confidence,
        createdAt: new Date(),
      };

      this.syntheses.push(synthesis);
      this.updateStatus('completed');
      this.updateProgress(100, 'Synthesis complete');

      return synthesis;
    } catch (error) {
      this.setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async handleSynthesizeRequest(
    message: AgentMessage<SynthesizeRequestPayload & SynthesisInput>
  ): Promise<void> {
    const synthesis = await this.synthesize(message.payload);

    const payload: SynthesisCompletePayload = {
      synthesisId: synthesis.id,
      summary: synthesis.summary,
      keyFindings: synthesis.keyFindings,
    };

    await this.sendMessage(message.from, MT.SYNTHESIS_COMPLETE, payload, message.iteration);
  }

  private async generateSynthesis(input: SynthesisInput): Promise<LLMSynthesisResult> {
    const findingsText = input.findings
      .map((f, i) => `${i + 1}. [${f.category}] ${f.content}\n   Confidence: ${f.confidence}, Sources: ${f.tags.join(', ')}`)
      .join('\n\n');

    const themesText = input.themes
      .map((t) => `- ${t.title}: ${t.description} (strength: ${t.strength})`)
      .join('\n');

    const contradictionsText = input.contradictions
      .map((c) => `- ${c.description}${c.resolved ? ' (resolved: ' + c.resolution + ')' : ''}`)
      .join('\n') || 'None identified';

    const gapsText = input.gaps
      .map((g) => `- [${g.priority}] ${g.subtopic}: ${g.description}`)
      .join('\n') || 'None identified';

    let prompt: string;

    if (input.isFinal) {
      prompt = FINAL_SYNTHESIS_PROMPT
        .replace('{topic}', this.topic)
        .replace('{iterations}', String(input.iteration))
        .replace('{sourceCount}', String(input.findings.length))
        .replace('{allFindings}', findingsText)
        .replace('{themes}', themesText)
        .replace('{contradictions}', contradictionsText)
        .replace('{gaps}', gapsText);
    } else if (input.previousSynthesis) {
      prompt = INCREMENTAL_SYNTHESIS_PROMPT
        .replace('{topic}', this.topic)
        .replace('{iteration}', String(input.iteration))
        .replace('{previousSynthesis}', JSON.stringify(input.previousSynthesis, null, 2))
        .replace('{newFindings}', findingsText)
        .replace('{themes}', themesText);
    } else {
      prompt = SYNTHESIS_PROMPT
        .replace('{topic}', this.topic)
        .replace('{depthLevel}', this.depthLevel)
        .replace('{outputStyle}', this.outputStyle)
        .replace('{customInstructions}', this.customInstructions || 'None')
        .replace('{findings}', findingsText)
        .replace('{themes}', themesText)
        .replace('{contradictions}', contradictionsText)
        .replace('{gaps}', gapsText);
    }

    this.updateProgress(30, 'Generating synthesis with LLM...');

    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: this.customPrompt || SYNTHESIZER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      maxTokens: 8000,
    });

    this.updateProgress(80, 'Processing synthesis result...');

    try {
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      return JSON.parse(jsonStr.trim()) as LLMSynthesisResult;
    } catch {
      console.error('Failed to parse synthesis response:', response.content);
      // Return a basic synthesis if parsing fails
      return {
        summary: response.content.slice(0, 1000),
        keyFindings: [],
        sections: [{ title: 'Research Findings', content: response.content, sources: [] }],
        confidence: 0.5,
      };
    }
  }

  getSyntheses(): Synthesis[] {
    return [...this.syntheses];
  }

  getLatestSynthesis(): Synthesis | undefined {
    return this.syntheses[this.syntheses.length - 1];
  }
}
