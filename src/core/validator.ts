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
} from '../types/index.js';
import { loadConfig, mergeConfig, getDefaultConfig } from './config.js';
import { loadRules } from './rule-loader.js';
import { executeRules, aggregateResults, flattenIssues } from './rule-engine.js';
import { parseFile } from '../parsers/file.js';
import { fetchToolsFromServer } from '../parsers/mcp-client.js';

// Package version (should match package.json)
const VALIDATOR_VERSION = '0.1.0';
const MCP_SPEC_VERSION = '2025-11-25';

/**
 * Options for validation functions.
 */
export interface ValidateOptions {
  /** Override default config */
  config?: Partial<ValidatorConfig>;
  /** Load config from file path */
  configPath?: string;
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
 * import { validate } from 'mcp-tool-validator';
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

  // Load and merge config
  let config: ValidatorConfig;
  if (options.configPath) {
    const loaded = await loadConfig(options.configPath);
    config = loaded.config;
  } else {
    config = getDefaultConfig();
  }

  // Apply any inline config overrides
  if (options.config) {
    config = mergeConfig({ ...config, ...options.config });
  }

  // Load enabled rules based on config
  const rules = await loadRules(config.rules);

  // Execute rules against all tools
  const toolResults = executeRules(tools, rules, config.rules);

  // Build per-tool results
  const toolValidationResults: ToolValidationResult[] = toolResults.map((tr) => ({
    name: tr.tool.name,
    valid: !tr.issues.some((i) => i.severity === 'error'),
    tool: tr.tool,
    issues: tr.issues,
  }));

  // Aggregate summary statistics
  const summary = aggregateResults(toolResults);
  const allIssues = flattenIssues(toolResults);

  // Build metadata
  const metadata: ValidationMetadata = {
    validatorVersion: VALIDATOR_VERSION,
    mcpSpecVersion: MCP_SPEC_VERSION,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    configUsed: options.configPath || '',
    llmAnalysisUsed: false,
  };

  return {
    valid: summary.issuesBySeverity.error === 0,
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
 * import { validateFile } from 'mcp-tool-validator';
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
 * import { validateServer } from 'mcp-tool-validator';
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
  const tools = await fetchToolsFromServer({ server: serverUrl });
  return validate(tools, options);
}
