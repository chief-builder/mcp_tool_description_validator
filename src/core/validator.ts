/**
 * Core Validator Module
 *
 * Main validation orchestrator that coordinates configuration loading,
 * rule execution, and result aggregation.
 */

import type {
  ToolDefinition,
  ValidationResult,
  ValidatorConfig,
  ValidationMetadata,
  ToolValidationResult,
  MCPSpecVersion,
} from '../types/index.js';
import { resolveConfig, type ConfigOverrides } from './config.js';
import { loadRules } from './rule-loader.js';
import { executeRules, aggregateResults, flattenIssues } from './rule-engine.js';
import { parseFile } from '../parsers/file.js';
import { fetchToolsFromServer } from '../parsers/mcp-client.js';
import { analyzeTools } from '../llm/analyzer.js';

import { VERSION as VALIDATOR_VERSION } from '../version.js';

/** Spec version reported/validated when the config does not set one. */
const DEFAULT_MCP_SPEC_VERSION = '2026-07-28';

/**
 * Options for validation functions.
 */
export interface ValidateOptions {
  /** Inline config overrides (sections may be partial) */
  config?: ConfigOverrides;
  /** Load config from file path */
  configPath?: string;
  /**
   * Search the working directory for a config file when `configPath` is
   * not set (default true). Set to false to use only the built-in defaults
   * plus `config`, e.g. when the caller has already resolved its config.
   */
  discoverConfig?: boolean;
  /** Live discovery: per-operation timeout in milliseconds (default 30000). */
  timeout?: number;
  /** Reproducibility context for live-server discovery. */
  runContext?: {
    serverEndpoint: string;
    discoverySpecVersion: MCPSpecVersion;
    authenticationScope: 'none' | 'unknown';
    toolExecutionPerformed: boolean;
  };
}

/**
 * Validate tool definitions directly.
 *
 * This is the main entry point for programmatic validation.
 * Validates an array of tool definitions and returns a complete validation result.
 *
 * @param tools - Array of tool definitions to validate
 * @param options - Optional configuration overrides
 * @returns Complete validation result with issues, summary, and metadata
 *
 * @example
 * ```typescript
 * import { validate } from 'mcp-tool-description-validator';
 *
 * const tools = [{
 *   name: 'my-tool',
 *   description: 'Does something useful',
 *   inputSchema: { type: 'object', properties: {} },
 *   source: { type: 'file', location: 'tools.json', raw: {} }
 * }];
 *
 * const result = await validate(tools);
 * if (!result.valid) {
 *   console.log('Validation errors:', result.issues);
 * }
 * ```
 */
export async function validate(
  tools: ToolDefinition[],
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();

  // Load config (explicit path or cosmiconfig discovery) and overlay
  // inline overrides per-section so they don't clobber file settings.
  const { config, filepath } = await resolveConfig(
    options.configPath,
    options.config,
    { discover: options.discoverConfig }
  );

  // Load enabled rules based on config and targeted spec version
  const specVersion = config.specVersion ?? DEFAULT_MCP_SPEC_VERSION;
  const rules = await loadRules(config.rules, specVersion);

  // Execute rules against all tools
  const toolResults = executeRules(
    tools,
    rules,
    config.rules,
    config.profile ?? 'governance'
  );

  // Build per-tool results
  const toolValidationResults: ToolValidationResult[] = toolResults.map((tr) => ({
    name: tr.tool.name,
    valid: !tr.issues.some((i) => i.severity === 'error'),
    tool: tr.tool,
    issues: tr.issues,
  }));

  // Optional LLM-assisted analysis. A failure here (missing provider
  // package, network error) must not discard the static results.
  let llmAnalysisUsed = false;
  let llmAnalysisError: string | undefined;
  if (config.llm?.enabled) {
    try {
      const analyses = await analyzeTools(tools, { config: config.llm });
      for (const toolResult of toolValidationResults) {
        const analysis = analyses.get(toolResult.name);
        if (analysis) {
          toolResult.llmAnalysis = analysis;
        }
      }
      llmAnalysisUsed = true;
    } catch (error) {
      llmAnalysisError =
        error instanceof Error ? error.message : String(error);
    }
  }

  // Aggregate summary statistics
  const summary = aggregateResults(toolResults);
  const allIssues = flattenIssues(toolResults);
  const compliant = !allIssues.some(
    (issue) =>
      issue.provenance === 'specification' && issue.severity === 'error'
  );

  // Build metadata
  const metadata: ValidationMetadata = {
    validatorVersion: VALIDATOR_VERSION,
    mcpSpecVersion: specVersion,
    validationProfile: config.profile ?? 'governance',
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    configUsed: filepath ?? '',
    llmAnalysisUsed,
    ...(options.runContext
      ? {
          discoverySpecVersion: options.runContext.discoverySpecVersion,
          serverEndpoint: options.runContext.serverEndpoint,
          authenticationScope: options.runContext.authenticationScope,
          toolExecutionPerformed: options.runContext.toolExecutionPerformed,
        }
      : {}),
    ...(llmAnalysisError !== undefined ? { llmAnalysisError } : {}),
  };

  return {
    valid: summary.issuesBySeverity.error === 0,
    compliant,
    summary,
    issues: allIssues,
    tools: toolValidationResults,
    metadata,
  };
}

/**
 * Validate tool definitions from a file (JSON or YAML).
 *
 * Loads and parses the file, then validates all tool definitions found.
 * Supports single tool, array of tools, or manifest format.
 *
 * @param filePath - Path to the file to validate
 * @param options - Optional configuration overrides
 * @returns Complete validation result
 *
 * @example
 * ```typescript
 * import { validateFile } from 'mcp-tool-description-validator';
 *
 * const result = await validateFile('./tools.json');
 * console.log(`Validated ${result.summary.totalTools} tools`);
 * ```
 */
export async function validateFile(
  filePath: string,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const tools = await parseFile(filePath);
  return validate(tools, options);
}

/**
 * Validate tool definitions from a live MCP server.
 *
 * Connects to the server, retrieves tool definitions, and validates them.
 * Supports both STDIO and HTTP transports.
 *
 * @param serverUrl - Server URL (http/https) or command to execute (for STDIO)
 * @param options - Optional configuration overrides
 * @returns Complete validation result
 *
 * @example
 * ```typescript
 * import { validateServer } from 'mcp-tool-description-validator';
 *
 * // HTTP server
 * const result = await validateServer('http://localhost:3000/mcp');
 *
 * // STDIO server
 * const result = await validateServer('node ./my-server.js');
 * ```
 */
export async function validateServer(
  serverUrl: string,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const { config } = await resolveConfig(options.configPath, options.config, {
    discover: options.discoverConfig,
  });
  const discoverySpecVersion =
    config.discoverySpecVersion ?? config.specVersion ?? DEFAULT_MCP_SPEC_VERSION;
  const tools = await fetchToolsFromServer({
    server: serverUrl,
    specVersion: discoverySpecVersion,
    timeout: options.timeout,
  });
  return validate(tools, {
    ...options,
    config,
    runContext: {
      serverEndpoint: serverUrl,
      discoverySpecVersion,
      authenticationScope:
        serverUrl.startsWith('http://') || serverUrl.startsWith('https://')
          ? 'none'
          : 'unknown',
      toolExecutionPerformed: false,
    },
  });
}
