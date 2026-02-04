export const ORCHESTRATOR_SYSTEM_PROMPT = `You are a Research Orchestrator managing a deep research session.

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

You must respond with valid JSON only.`;

export const PLANNING_PROMPT = `Given the following research topic, create a comprehensive research plan.

Topic: {topic}

User's focus areas: {focusAreas}
Areas to exclude: {excludeTopics}
Research depth: {depthLevel}
Custom instructions: {customInstructions}

Create a research plan with the following JSON structure:
{
  "mainTopic": "The main research topic",
  "strategy": "Brief description of the research strategy",
  "subtopics": [
    {
      "id": "unique-id",
      "title": "Subtopic title",
      "description": "Brief description of what to research",
      "searchQueries": ["query 1", "query 2", "query 3"]
    }
  ]
}

Generate {subtopicCount} subtopics that cover different aspects of the main topic.
Each subtopic should have 3-5 search queries.

Respond with ONLY the JSON, no additional text.`;

export const EVALUATION_PROMPT = `Evaluate the current research progress and decide on next steps.

Main topic: {topic}
Current iteration: {iteration}
Max iterations: {maxIterations}

Subtopics coverage:
{subtopicsCoverage}

Current findings summary:
{findingsSummary}

Knowledge gaps identified:
{gaps}

User feedback (if any): {userFeedback}

Based on this information, respond with a JSON object:
{
  "decision": "continue" | "synthesize" | "expand",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of the decision",
  "newSubtopics": [...] // Only if decision is "expand"
  "focusAreas": [...] // Areas to prioritize in next iteration
}

Respond with ONLY the JSON, no additional text.`;

export const MERGE_FINDINGS_PROMPT = `Analyze and merge the following research findings, identifying key themes, contradictions, and gaps.

Topic: {topic}

Findings from researchers:
{findings}

Respond with a JSON object:
{
  "keyThemes": [
    {
      "title": "Theme title",
      "description": "Theme description",
      "supportingFindings": ["finding-id-1", "finding-id-2"],
      "strength": 0.0-1.0
    }
  ],
  "contradictions": [
    {
      "description": "Description of the contradiction",
      "findings": ["finding-id-1", "finding-id-2"]
    }
  ],
  "gaps": [
    {
      "subtopic": "Area lacking coverage",
      "description": "What information is missing",
      "priority": "high" | "medium" | "low",
      "suggestedQueries": ["query 1", "query 2"]
    }
  ],
  "overallConfidence": 0.0-1.0
}

Respond with ONLY the JSON, no additional text.`;
