import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

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

/**
 * Core Validator Module
 *
 * Main validation orchestrator that coordinates configuration loading,
 * rule execution, and result aggregation.
 */

/**
 * Options for validation functions.
 */
interface ValidateOptions {
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
declare function validate(tools: ToolDefinition[], options?: ValidateOptions): Promise<ValidationResult>;
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
declare function validateFile(filePath: string, options?: ValidateOptions): Promise<ValidationResult>;
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
declare function validateServer(serverUrl: string, options?: ValidateOptions): Promise<ValidationResult>;

/**
 * Configuration loading and management for MCP Tool Validator
 *
 * Uses cosmiconfig for flexible config file discovery and loading.
 * Supports: mcp-validate.config.yaml, mcp-validate.config.json, .mcp-validaterc, etc.
 */

/**
 * Result from loading configuration
 */
interface LoadConfigResult {
    /** The merged configuration */
    config: ValidatorConfig;
    /** Path to the config file that was loaded, or null if using defaults */
    filepath: string | null;
}
/**
 * Load configuration from various sources using cosmiconfig.
 *
 * Searches for configuration in the following order:
 * 1. Explicit config path (if provided)
 * 2. mcp-validate.config.yaml / mcp-validate.config.yml
 * 3. mcp-validate.config.json
 * 4. .mcp-validaterc (YAML or JSON)
 * 5. .mcp-validaterc.yaml / .mcp-validaterc.yml
 * 6. .mcp-validaterc.json
 * 7. "mcp-validate" key in package.json
 *
 * @param configPath - Optional explicit path to config file
 * @returns The loaded configuration merged with defaults, and the filepath
 */
declare function loadConfig(configPath?: string): Promise<LoadConfigResult>;
/**
 * Deep merge user configuration with defaults.
 *
 * Merging rules:
 * - User rules override default rules (false disables, severity overrides)
 * - User output settings override defaults
 * - LLM config is only present if user provides it
 *
 * @param userConfig - Partial user configuration
 * @returns Complete merged configuration
 */
declare function mergeConfig(userConfig: Partial<ValidatorConfig>): ValidatorConfig;
/**
 * Get a fresh copy of the default configuration.
 *
 * @returns Default ValidatorConfig with all rules enabled
 */
declare function getDefaultConfig(): ValidatorConfig;

interface HumanOutputOptions {
    color?: boolean;
    verbose?: boolean;
}
/**
 * Format validation results for human-readable terminal output
 */
declare function formatHumanOutput(result: ValidationResult, options?: HumanOutputOptions): string;

/**
 * Format validation results as JSON
 */
declare function formatJsonOutput(result: ValidationResult): string;

/**
 * Format validation results as SARIF 2.1.0
 */
declare function formatSarifOutput(result: ValidationResult): string;

/**
 * Parse a file containing MCP tool definitions.
 *
 * Supports JSON and YAML files containing:
 * - Single tool definition
 * - Array of tool definitions (bare array or { tools: [...] })
 * - Manifest format with server metadata ({ name, version, tools: [...] })
 *
 * @param filePath - Path to the file to parse
 * @returns Array of parsed tool definitions with source metadata
 * @throws Error if file format is unsupported or parsing fails
 */
declare function parseFile(filePath: string): Promise<ToolDefinition[]>;

/**
 * MCP Client Module
 *
 * Connects to live MCP servers via STDIO or HTTP transport
 * to retrieve tool definitions.
 */

/**
 * Represents an active MCP connection.
 */
interface MCPConnection {
    /** The MCP client instance */
    client: Client;
    /** The transport layer (STDIO or HTTP) */
    transport: Transport;
}
/**
 * Configuration for connecting to an MCP server.
 */
interface ServerConfig {
    /** Server URL (http/https) or command to execute (for stdio) */
    server: string;
    /** Optional timeout in milliseconds (default: 30000) */
    timeout?: number;
}
/**
 * Connect to an MCP server.
 *
 * Supports two transport types:
 * - **STDIO transport**: For commands like "node server.js", "python server.py"
 * - **HTTP transport**: For URLs like "http://localhost:3000/mcp", "https://..."
 *
 * @param config - Server configuration
 * @returns MCP connection object
 * @throws Error if connection fails
 *
 * @example
 * ```typescript
 * // Connect to STDIO server
 * const conn = await connectToServer({ server: 'node my-server.js' });
 *
 * // Connect to HTTP server
 * const conn = await connectToServer({ server: 'http://localhost:3000/mcp' });
 * ```
 */
declare function connectToServer(config: ServerConfig): Promise<MCPConnection>;
/**
 * Get tool definitions from a connected MCP server.
 *
 * @param connection - Active MCP connection
 * @param serverUrl - Server URL/command for source tracking
 * @returns Array of tool definitions
 */
declare function getToolDefinitions(connection: MCPConnection, serverUrl: string): Promise<ToolDefinition[]>;
/**
 * Disconnect from an MCP server.
 *
 * @param connection - Active MCP connection to close
 */
declare function disconnect(connection: MCPConnection): Promise<void>;
/**
 * Convenience function to connect, get tools, and disconnect.
 *
 * @param config - Server configuration
 * @returns Array of tool definitions
 *
 * @example
 * ```typescript
 * const tools = await fetchToolsFromServer({ server: 'http://localhost:3000/mcp' });
 * console.log(`Found ${tools.length} tools`);
 * ```
 */
declare function fetchToolsFromServer(config: ServerConfig): Promise<ToolDefinition[]>;

/**
 * Rule Engine Type Definitions
 *
 * Types for validation rules, rule execution context, and results.
 */

/**
 * Context provided to each rule during validation.
 */
interface RuleContext {
    /** All tools being validated (for cross-tool checks) */
    allTools: ToolDefinition[];
    /** Configuration for this specific rule */
    ruleConfig: boolean | IssueSeverity;
}
/**
 * Rule definition interface.
 * Each validation rule must implement this interface.
 */
interface Rule {
    /** Unique rule ID (e.g., "SEC-001") */
    id: string;
    /** Rule category */
    category: IssueCategory;
    /** Default severity if not overridden by config */
    defaultSeverity: IssueSeverity;
    /** Human-readable description of what the rule checks */
    description: string;
    /** Documentation URL (optional) */
    documentation?: string;
    /**
     * Check a single tool and return any validation issues.
     * @param tool The tool to validate
     * @param ctx Rule execution context
     * @returns Array of validation issues (empty if no issues)
     */
    check(tool: ToolDefinition, ctx: RuleContext): ValidationIssue[];
}

export { type IssueCategory, type IssueSeverity, type JSONSchema, type LLMConfig, type OutputConfig, type Rule, type RuleConfig, type RuleContext, type ToolAnnotations, type ToolDefinition, type ToolSource, type ToolValidationResult, type ValidateOptions, type ValidationIssue, type ValidationMetadata, type ValidationResult, type ValidationSummary, type ValidatorConfig, connectToServer, disconnect, fetchToolsFromServer, formatHumanOutput, formatJsonOutput, formatSarifOutput, getDefaultConfig, getToolDefinitions, loadConfig, mergeConfig, parseFile, validate, validateFile, validateServer };
