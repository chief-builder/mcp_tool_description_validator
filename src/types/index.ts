/**
 * MCP Tool Validator Type Definitions
 *
 * Core types for validating Model Context Protocol (MCP) tool definitions.
 */

// ============================================================================
// JSON Schema Types
// ============================================================================

/**
 * JSON Schema type representation.
 * This is a simplified type alias for JSON Schema objects.
 * For full JSON Schema support, consider using json-schema types.
 */
export type JSONSchema = Record<string, unknown>;

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * Internal representation of an MCP tool definition.
 */
export interface ToolDefinition {
  /** Tool name (1-128 characters of [A-Za-z0-9_.-]) */
  name: string;

  /** Optional human-readable display name (takes precedence over annotations.title) */
  title?: string;

  /** Optional human-readable description for LLM understanding */
  description?: string;

  /** Optional icons for display in user interfaces */
  icons?: ToolIcon[];

  /** JSON Schema defining the tool's input parameters */
  inputSchema: JSONSchema;

  /** Optional JSON Schema describing the tool's structured output */
  outputSchema?: JSONSchema;

  /** Optional MCP annotations for tool behavior hints */
  annotations?: ToolAnnotations;

  /** Optional metadata reserved for MCP extensions */
  _meta?: Record<string, unknown>;

  /** Metadata about where this tool definition came from */
  source: ToolSource;
}

/**
 * An icon entry for a tool (MCP spec: `icons` array).
 */
export interface ToolIcon {
  /** Icon location: HTTPS URL or data: URI */
  src: string;

  /** Optional MIME type (e.g. "image/png") */
  mimeType?: string;

  /** Optional sizes (e.g. ["48x48"] or ["any"]) */
  sizes?: string[];

  /** Optional theme the icon is designed for */
  theme?: 'light' | 'dark';
}

/**
 * Source information for a tool definition.
 */
export interface ToolSource {
  /** Type of source: file or MCP server */
  type: 'file' | 'server';

  /** File path or server URL */
  location: string;

  /** Original unparsed data */
  raw: unknown;
}

/**
 * MCP tool annotations providing behavioral hints.
 */
export interface ToolAnnotations {
  /** Human-readable title for display purposes */
  title?: string;

  /** Indicates the tool only reads data, does not modify state */
  readOnlyHint?: boolean;

  /** Indicates the tool performs destructive operations */
  destructiveHint?: boolean;

  /** Indicates the tool is idempotent (safe to call multiple times) */
  idempotentHint?: boolean;

  /** Indicates the tool interacts with external systems */
  openWorldHint?: boolean;
}

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Complete validation result for a validation run.
 */
export interface ValidationResult {
  /** Whether all tools passed validation without errors */
  valid: boolean;

  /** Whether no MCP specification finding has error severity */
  compliant?: boolean;

  /** Summary statistics for the validation run */
  summary: ValidationSummary;

  /** All validation issues found across all tools */
  issues: ValidationIssue[];

  /** Per-tool validation results */
  tools: ToolValidationResult[];

  /** Metadata about the validation run */
  metadata: ValidationMetadata;
}

/**
 * Summary statistics for a validation run.
 */
export interface ValidationSummary {
  /** Total number of tools validated */
  totalTools: number;

  /** Number of tools that passed without errors */
  validTools: number;

  /** Count of issues grouped by category */
  issuesByCategory: Record<IssueCategory, number>;

  /** Count of issues grouped by severity */
  issuesBySeverity: Record<IssueSeverity, number>;

  /** Count of issues grouped by finding provenance */
  issuesByProvenance?: Record<IssueProvenance, number>;

  /** Maturity score (0-100), per-tool averaged */
  maturityScore: number;

  /** Maturity level derived from score */
  maturityLevel: MaturityLevel;
}

/**
 * A single validation issue found during validation.
 */
export interface ValidationIssue {
  /** Unique rule identifier (e.g., "SEC-001", "LLM-003") */
  id: string;

  /** Issue category for grouping */
  category: IssueCategory;

  /** Severity level */
  severity: IssueSeverity;

  /** Whether the finding comes from the MCP spec, policy, or a heuristic */
  provenance?: IssueProvenance;

  /** Human-readable issue description */
  message: string;

  /** Name of the tool this issue applies to */
  tool: string;

  /** JSON path to the problematic field (e.g., "inputSchema.properties.userId") */
  path?: string;

  /** Suggested fix or improvement */
  suggestion?: string;

  /** Link to relevant documentation */
  documentation?: string;
}

/**
 * Categories for grouping validation issues.
 */
export type IssueCategory =
  | 'schema' // JSON Schema compliance issues
  | 'security' // Security vulnerabilities
  | 'llm-compatibility' // LLM understanding issues
  | 'naming' // Naming convention violations
  | 'best-practice'; // Recommended improvements

/**
 * Severity levels for validation issues.
 */
export type IssueSeverity = 'error' | 'warning' | 'suggestion';

/** Origin and authority of a validation finding. */
export type IssueProvenance = 'specification' | 'governance' | 'heuristic';

/**
 * Maturity levels for tool definitions based on validation score.
 *
 * - Immature (0-40): High risk of misuse; basic functionality only
 * - Moderate (41-70): Usable in simple agents; some guidance
 * - Mature (71-90): Reliable for complex workflows
 * - Exemplary (91-100): Optimized for advanced multi-tool agents
 */
export type MaturityLevel = 'immature' | 'moderate' | 'mature' | 'exemplary';

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
 * Validation result for a single tool.
 */
export interface ToolValidationResult {
  /** Tool name */
  name: string;

  /** Whether the tool passed validation without errors */
  valid: boolean;

  /** Issues found for this specific tool */
  issues: ValidationIssue[];

  /** The original tool definition (for reference) */
  tool: ToolDefinition;

  /** LLM analysis result (present when LLM analysis was enabled) */
  llmAnalysis?: LLMAnalysisResult;
}

/**
 * Metadata about a validation run.
 */
export interface ValidationMetadata {
  /** Version of the validator */
  validatorVersion: string;

  /** MCP specification version validated against */
  mcpSpecVersion: string;

  /** MCP revision used to discover tools from a live server */
  discoverySpecVersion?: string;

  /** Active validation policy profile */
  validationProfile?: ValidationProfile;

  /** Live server endpoint or stdio command, when applicable */
  serverEndpoint?: string;

  /** Authentication scope used for discovery */
  authenticationScope?: 'none' | 'unknown';

  /** Whether the validator executed a server tool (always false today) */
  toolExecutionPerformed?: boolean;

  /** ISO 8601 timestamp when validation started */
  timestamp: string;

  /** Validation duration in milliseconds */
  duration: number;

  /** Path to configuration file used (empty string if none) */
  configUsed: string;

  /** Whether LLM analysis was performed */
  llmAnalysisUsed: boolean;

  /** Error message when LLM analysis was requested but failed */
  llmAnalysisError?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * MCP specification versions the validator can target.
 */
export type { MCPSpecVersion } from '../core/spec-versions.js';
import type { MCPSpecVersion } from '../core/spec-versions.js';

/** Built-in severity policy profiles. */
export type ValidationProfile = 'compliance' | 'governance';

/**
 * Complete validator configuration.
 */
export interface ValidatorConfig {
  /** Rule configuration: enable/disable rules and override severities */
  rules: RuleConfig;

  /** Output configuration */
  output: OutputConfig;

  /** MCP spec version to validate against (default: '2026-07-28') */
  specVersion?: MCPSpecVersion;

  /** MCP revision used for live discovery (defaults to specVersion) */
  discoverySpecVersion?: MCPSpecVersion;

  /** Validation policy profile (default: governance) */
  profile?: ValidationProfile;

  /** Optional LLM analysis configuration */
  llm?: LLMConfig;
}

/**
 * Rule configuration mapping rule IDs to enabled/disabled or severity override.
 *
 * - `true` or severity: Enable rule (with optional severity override)
 * - `false`: Disable rule
 */
export interface RuleConfig {
  [ruleId: string]: boolean | IssueSeverity;
}

/**
 * Output format and display configuration.
 */
export interface OutputConfig {
  /** Output format */
  format: 'human' | 'json' | 'sarif';

  /** Enable verbose output with additional details */
  verbose: boolean;

  /** Enable colored output (terminal only) */
  color: boolean;
}

/**
 * LLM analysis configuration.
 */
export interface LLMConfig {
  /** Whether to enable LLM analysis */
  enabled: boolean;

  /** LLM provider name */
  provider: 'openai' | 'anthropic' | 'ollama' | string;

  /** Model identifier */
  model: string;

  /** API key (can also be set via environment variable) */
  apiKey?: string;

  /** Base URL for custom endpoints */
  baseUrl?: string;

  /** Request timeout in milliseconds */
  timeout: number;
}
