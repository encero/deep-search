export const SYNTHESIZER_SYSTEM_PROMPT = `You are a Research Synthesizer creating comprehensive summaries from collected findings.

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

You must respond with valid JSON only.`;

export const SYNTHESIS_PROMPT = `Create a comprehensive synthesis of the following research findings.

Main topic: {topic}
Research depth: {depthLevel}
Output style: {outputStyle}
Custom instructions: {customInstructions}

All findings from research:
{findings}

Key themes identified:
{themes}

Known contradictions:
{contradictions}

Knowledge gaps:
{gaps}

Create a synthesis with the following JSON structure:
{
  "summary": "A comprehensive executive summary (2-4 paragraphs)",
  "keyFindings": [
    {
      "title": "Finding title",
      "description": "Detailed description of the finding",
      "importance": "high" | "medium" | "low",
      "sources": ["source-url-1", "source-url-2"]
    }
  ],
  "sections": [
    {
      "title": "Section title",
      "content": "Detailed content for this section (markdown formatted)",
      "sources": ["source-url-1", "source-url-2"]
    }
  ],
  "confidence": 0.0-1.0,
  "limitations": ["Limitation 1", "Limitation 2"],
  "suggestedFurtherResearch": ["Topic 1", "Topic 2"]
}

Requirements:
- Summary should capture the most important insights
- Key findings should be ordered by importance
- Sections should cover different aspects of the topic logically
- All claims should cite sources
- Confidence should reflect the overall quality and consistency of findings

Respond with ONLY the JSON, no additional text.`;

export const INCREMENTAL_SYNTHESIS_PROMPT = `Update the synthesis with new findings from the latest research iteration.

Main topic: {topic}
Iteration: {iteration}

Previous synthesis:
{previousSynthesis}

New findings from this iteration:
{newFindings}

Updated themes:
{themes}

Create an updated synthesis that incorporates the new findings:
{
  "summary": "Updated executive summary",
  "keyFindings": [...],
  "sections": [...],
  "confidence": 0.0-1.0,
  "changesFromPrevious": "Brief description of what changed",
  "newInsights": ["New insight 1", "New insight 2"]
}

Respond with ONLY the JSON, no additional text.`;

export const FINAL_SYNTHESIS_PROMPT = `Create the final, comprehensive research report.

Main topic: {topic}
Total iterations: {iterations}
Total sources consulted: {sourceCount}

All accumulated findings:
{allFindings}

Final themes:
{themes}

Resolved and unresolved contradictions:
{contradictions}

Remaining gaps:
{gaps}

Create a thorough final synthesis:
{
  "summary": "Comprehensive executive summary (3-5 paragraphs)",
  "keyFindings": [
    {
      "title": "Finding title",
      "description": "Detailed description",
      "importance": "high" | "medium" | "low",
      "sources": ["url1", "url2"],
      "confidence": 0.0-1.0
    }
  ],
  "sections": [
    {
      "title": "Section title",
      "content": "Comprehensive markdown-formatted content",
      "sources": ["url1", "url2"]
    }
  ],
  "methodology": "Description of research methodology",
  "limitations": ["Limitation 1", "Limitation 2"],
  "conclusions": "Final conclusions and takeaways",
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "furtherResearch": ["Suggested research direction 1", "Direction 2"],
  "confidence": 0.0-1.0,
  "sourcesSummary": {
    "totalSources": number,
    "academicSources": number,
    "newsSources": number,
    "otherSources": number
  }
}

This is the final deliverable. Make it comprehensive, well-organized, and actionable.

Respond with ONLY the JSON, no additional text.`;
