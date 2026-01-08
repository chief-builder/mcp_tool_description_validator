/**
 * MCP Tool Validator - Library Entry Point
 *
 * A governance validator for Model Context Protocol (MCP) tool definitions
 * that ensures quality, security, and LLM-compatibility.
 */

// Export all types
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

// Placeholder exports for future implementation
// export { validate, validateFile, validateServer } from './core/validator.js';
