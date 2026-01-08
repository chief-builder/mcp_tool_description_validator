/**
 * Rule Engine Type Definitions
 *
 * Types for validation rules, rule execution context, and results.
 */

import type {
  ToolDefinition,
  ValidationIssue,
  IssueCategory,
  IssueSeverity,
} from '../types/index.js';

/**
 * Context provided to each rule during validation.
 */
export interface RuleContext {
  /** All tools being validated (for cross-tool checks) */
  allTools: ToolDefinition[];
  /** Configuration for this specific rule */
  ruleConfig: boolean | IssueSeverity;
}

/**
 * Rule definition interface.
 * Each validation rule must implement this interface.
 */
export interface Rule {
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

/**
 * Result of executing all rules against a tool.
 */
export interface ToolRuleResults {
  tool: ToolDefinition;
  issues: ValidationIssue[];
}
