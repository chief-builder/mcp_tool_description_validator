/**
 * MCP Tool Validator - Library Entry Point
 *
 * A governance validator for Model Context Protocol (MCP) tool definitions
 * that ensures quality, security, and LLM-compatibility.
 *
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export type {
  JSONSchema,
  ToolDefinition,
  ToolIcon,
  ToolSource,
  ToolAnnotations,
  MCPSpecVersion,
  ValidationResult,
  ValidationSummary,
  ValidationIssue,
  IssueCategory,
  IssueSeverity,
  IssueProvenance,
  ValidationProfile,
  ToolValidationResult,
  ValidationMetadata,
  ValidatorConfig,
  RuleConfig,
  OutputConfig,
  LLMConfig,
} from './types/index.js';

// ============================================================================
// Core validation functions
// ============================================================================

export {
  validate,
  validateFile,
  validateServer,
  type ValidateOptions,
} from './core/validator.js';

// ============================================================================
// Configuration
// ============================================================================

export {
  loadConfig,
  mergeConfig,
  getDefaultConfig,
} from './core/config.js';

// ============================================================================
// Reporters
// ============================================================================

export {
  formatHumanOutput,
  formatJsonOutput,
  formatSarifOutput,
} from './reporters/index.js';

// ============================================================================
// HTTP service
// ============================================================================

export {
  createApp,
  startServer,
  jsonLineLogger,
  type CreateAppOptions,
  type StartServerOptions,
  type ValidateRequest,
  type Logger,
  type LogEntry,
} from './service/server.js';

// ============================================================================
// Parsers (for advanced use)
// ============================================================================

export { parseFile } from './parsers/file.js';

export {
  connectToServer,
  getToolDefinitions,
  disconnect,
  fetchToolsFromServer,
  MCPProtocolError,
  UnsupportedProtocolVersionError,
  HeaderMismatchError,
} from './parsers/mcp-client.js';

// ============================================================================
// LLM Analyzer
// ============================================================================

export {
  analyzeTool,
  analyzeTools,
  createDefaultLLMConfig,
  type LLMAnalysisResult,
  type AnalyzeOptions,
} from './llm/analyzer.js';

// ============================================================================
// Rule types (for custom rules in future)
// ============================================================================

export type { Rule, RuleContext } from './rules/types.js';
