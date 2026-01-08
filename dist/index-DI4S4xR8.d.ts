/**
 * MCP Tool Validator Type Definitions
 *
 * Core types for validating Model Context Protocol (MCP) tool definitions.
 */
/**
 * JSON Schema type representation.
 * This is a simplified type alias for JSON Schema objects.
 * For full JSON Schema support, consider using json-schema types.
 */
type JSONSchema = Record<string, unknown>;
/**
 * Internal representation of an MCP tool definition.
 */
interface ToolDefinition {
    /** Tool name (kebab-case recommended) */
    name: string;
    /** Human-readable description for LLM understanding */
    description: string;
    /** JSON Schema defining the tool's input parameters */
    inputSchema: JSONSchema;
    /** Optional MCP annotations for tool behavior hints */
    annotations?: ToolAnnotations;
    /** Metadata about where this tool definition came from */
    source: ToolSource;
}
/**
 * Source information for a tool definition.
 */
interface ToolSource {
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
interface ToolAnnotations {
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
/**
 * Complete validation result for a validation run.
 */
interface ValidationResult {
    /** Whether all tools passed validation without errors */
    valid: boolean;
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
interface ValidationSummary {
    /** Total number of tools validated */
    totalTools: number;
    /** Number of tools that passed without errors */
    validTools: number;
    /** Count of issues grouped by category */
    issuesByCategory: Record<IssueCategory, number>;
    /** Count of issues grouped by severity */
    issuesBySeverity: Record<IssueSeverity, number>;
}
/**
 * A single validation issue found during validation.
 */
interface ValidationIssue {
    /** Unique rule identifier (e.g., "SEC-001", "LLM-003") */
    id: string;
    /** Issue category for grouping */
    category: IssueCategory;
    /** Severity level */
    severity: IssueSeverity;
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
type IssueCategory = 'schema' | 'security' | 'llm-compatibility' | 'naming' | 'best-practice';
/**
 * Severity levels for validation issues.
 */
type IssueSeverity = 'error' | 'warning' | 'suggestion';
/**
 * Validation result for a single tool.
 */
interface ToolValidationResult {
    /** Tool name */
    name: string;
    /** Whether the tool passed validation without errors */
    valid: boolean;
    /** Issues found for this specific tool */
    issues: ValidationIssue[];
    /** The original tool definition (for reference) */
    tool: ToolDefinition;
}
/**
 * Metadata about a validation run.
 */
interface ValidationMetadata {
    /** Version of the validator */
    validatorVersion: string;
    /** MCP specification version validated against (always "2025-11-25") */
    mcpSpecVersion: string;
    /** ISO 8601 timestamp when validation started */
    timestamp: string;
    /** Validation duration in milliseconds */
    duration: number;
    /** Path to configuration file used (empty string if none) */
    configUsed: string;
    /** Whether LLM analysis was performed */
    llmAnalysisUsed: boolean;
}
/**
 * Complete validator configuration.
 */
interface ValidatorConfig {
    /** Rule configuration: enable/disable rules and override severities */
    rules: RuleConfig;
    /** Output configuration */
    output: OutputConfig;
    /** Optional LLM analysis configuration */
    llm?: LLMConfig;
}
/**
 * Rule configuration mapping rule IDs to enabled/disabled or severity override.
 *
 * - `true` or severity: Enable rule (with optional severity override)
 * - `false`: Disable rule
 */
interface RuleConfig {
    [ruleId: string]: boolean | IssueSeverity;
}
/**
 * Output format and display configuration.
 */
interface OutputConfig {
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
interface LLMConfig {
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

export type { IssueSeverity as I, JSONSchema as J, LLMConfig as L, OutputConfig as O, RuleConfig as R, ToolDefinition as T, ValidatorConfig as V, ValidationResult as a, IssueCategory as b, ValidationIssue as c, ToolSource as d, ToolAnnotations as e, ValidationSummary as f, ToolValidationResult as g, ValidationMetadata as h };
