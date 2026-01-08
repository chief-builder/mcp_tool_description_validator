/**
 * LLM Analyzer for MCP Tool Definitions
 *
 * Uses Vercel AI SDK to perform LLM-assisted analysis of tool definitions
 * for clarity, completeness, ambiguity detection, and improvement suggestions.
 */

import { generateText } from 'ai';
import type { ToolDefinition, LLMConfig } from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of LLM analysis for a single tool definition.
 */
export interface LLMAnalysisResult {
  /** Clarity score (1-10): How clear is the description for an AI to understand? */
  clarity_score: number;

  /** Completeness score (1-10): Does it cover what, when, and how? */
  completeness_score: number;

  /** List of vague phrases that could cause misuse */
  ambiguities: string[];

  /** List of contradictions between description and schema */
  conflicts: string[];

  /** List of specific improvement suggestions */
  suggestions: string[];
}

/**
 * Options for analyzing tools with LLM.
 */
export interface AnalyzeOptions {
  /** LLM configuration */
  config: LLMConfig;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * LLM prompt template for analyzing tool definitions.
 */
const ANALYSIS_PROMPT = `You are evaluating MCP tool definitions for LLM compatibility.

Tool Definition:
- Name: {name}
- Description: {description}
- Parameters: {parameters}

Evaluate this tool definition and respond with JSON only (no markdown):
{
  "clarity_score": <1-10>,
  "completeness_score": <1-10>,
  "ambiguities": ["list of vague phrases"],
  "conflicts": ["list of description/schema mismatches"],
  "suggestions": ["list of specific improvements"]
}

Consider:
- Would an AI understand when to call this tool?
- Are there edge cases not addressed?
- Could the description lead to incorrect usage?`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the provider model for Vercel AI SDK.
 * Dynamically imports the provider package to support optional peer dependencies.
 */
async function getModel(config: LLMConfig) {
  switch (config.provider) {
    case 'openai': {
      // @ts-expect-error - Optional peer dependency, may not be installed
      const { openai } = await import('@ai-sdk/openai');
      return openai(config.model);
    }
    case 'anthropic': {
      // @ts-expect-error - Optional peer dependency, may not be installed
      const { anthropic } = await import('@ai-sdk/anthropic');
      return anthropic(config.model);
    }
    case 'ollama': {
      // @ts-expect-error - Optional peer dependency, may not be installed
      const { ollama } = await import('ollama-ai-provider');
      return ollama(config.model);
    }
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

/**
 * Format tool parameters for the prompt in a human-readable format.
 */
function formatParameters(inputSchema: Record<string, unknown>): string {
  const properties = (inputSchema.properties as Record<string, unknown>) || {};
  const required = (inputSchema.required as string[]) || [];

  const params = Object.entries(properties).map(([name, schema]) => {
    const s = schema as Record<string, unknown>;
    const isRequired = required.includes(name);
    return `- ${name}${isRequired ? ' (required)' : ''}: ${s.type || 'any'} - ${s.description || 'no description'}`;
  });

  return params.length > 0 ? params.join('\n') : 'No parameters';
}

/**
 * Parse LLM response and validate the result structure.
 * Handles cases where LLM wraps response in markdown code blocks.
 */
function parseAnalysisResponse(text: string): LLMAnalysisResult {
  // Try to extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const result = JSON.parse(jsonMatch[0]) as Partial<LLMAnalysisResult>;

  // Validate and normalize result structure
  return {
    clarity_score: Math.min(10, Math.max(1, result.clarity_score || 5)),
    completeness_score: Math.min(10, Math.max(1, result.completeness_score || 5)),
    ambiguities: Array.isArray(result.ambiguities) ? result.ambiguities : [],
    conflicts: Array.isArray(result.conflicts) ? result.conflicts : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
  };
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze a single tool definition using LLM.
 *
 * @param tool - The tool definition to analyze
 * @param options - Analysis options including LLM configuration
 * @returns LLM analysis result with scores and suggestions
 * @throws Error if LLM call fails or response cannot be parsed
 *
 * @example
 * ```typescript
 * const result = await analyzeTool(tool, {
 *   config: {
 *     enabled: true,
 *     provider: 'anthropic',
 *     model: 'claude-3-haiku-20240307',
 *     timeout: 30000,
 *   }
 * });
 * console.log(result.clarity_score); // 1-10
 * ```
 */
export async function analyzeTool(
  tool: ToolDefinition,
  options: AnalyzeOptions
): Promise<LLMAnalysisResult> {
  const model = await getModel(options.config);

  const prompt = ANALYSIS_PROMPT.replace('{name}', tool.name)
    .replace('{description}', tool.description)
    .replace('{parameters}', formatParameters(tool.inputSchema));

  const { text } = await generateText({
    model,
    prompt,
    maxOutputTokens: 1000,
  });

  try {
    return parseAnalysisResponse(text);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error}`);
  }
}

/**
 * Analyze multiple tool definitions using LLM.
 * Processes tools sequentially to avoid rate limiting.
 *
 * @param tools - Array of tool definitions to analyze
 * @param options - Analysis options including LLM configuration
 * @returns Map of tool names to their analysis results
 *
 * @example
 * ```typescript
 * const results = await analyzeTools(tools, { config: llmConfig });
 * for (const [toolName, result] of results) {
 *   console.log(`${toolName}: clarity=${result.clarity_score}`);
 * }
 * ```
 */
export async function analyzeTools(
  tools: ToolDefinition[],
  options: AnalyzeOptions
): Promise<Map<string, LLMAnalysisResult>> {
  const results = new Map<string, LLMAnalysisResult>();

  for (const tool of tools) {
    const result = await analyzeTool(tool, options);
    results.set(tool.name, result);
  }

  return results;
}

/**
 * Create a default LLM configuration.
 * LLM analysis is disabled by default and must be explicitly enabled.
 *
 * @returns Default LLM configuration object
 *
 * @example
 * ```typescript
 * const config = createDefaultLLMConfig();
 * config.enabled = true;
 * config.apiKey = process.env.ANTHROPIC_API_KEY;
 * ```
 */
export function createDefaultLLMConfig(): LLMConfig {
  return {
    enabled: false,
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    timeout: 30000,
  };
}
