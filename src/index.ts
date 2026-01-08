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
  ToolSource,
  ToolAnnotations,
  ValidationResult,
  ValidationSummary,
  ValidationIssue,
  IssueCategory,
  IssueSeverity,
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
// Parsers (for advanced use)
// ============================================================================

export { parseFile } from './parsers/file.js';

export {
  connectToServer,
  getToolDefinitions,
  disconnect,
  fetchToolsFromServer,
} from './parsers/mcp-client.js';

// ============================================================================
// Rule types (for custom rules in future)
// ============================================================================

export type { Rule, RuleContext } from './rules/types.js';
