/**
 * Rule Engine
 *
 * Executes validation rules against tools and aggregates results.
 */

import type { Rule, RuleContext, ToolRuleResults } from '../rules/types.js';
import type {
  ToolDefinition,
  ValidationIssue,
  RuleConfig,
  ValidationSummary,
  IssueCategory,
  IssueSeverity,
} from '../types/index.js';
import { getEffectiveSeverity } from './rule-loader.js';

/**
 * Execute all loaded rules against a set of tools.
 */
export function executeRules(
  tools: ToolDefinition[],
  rules: Rule[],
  config: RuleConfig
): ToolRuleResults[] {
  const results: ToolRuleResults[] = [];

  for (const tool of tools) {
    const issues: ValidationIssue[] = [];

    for (const rule of rules) {
      // Skip if rule is disabled
      if (config[rule.id] === false) continue;

      const ctx: RuleContext = {
        allTools: tools,
        ruleConfig: config[rule.id] ?? true,
      };

      const ruleIssues = rule.check(tool, ctx);

      // Apply effective severity from config
      const effectiveSeverity = getEffectiveSeverity(rule, config);
      for (const issue of ruleIssues) {
        issues.push({
          ...issue,
          severity: effectiveSeverity,
        });
      }
    }

    results.push({ tool, issues });
  }

  return results;
}

/**
 * Aggregate results into a validation summary.
 */
export function aggregateResults(results: ToolRuleResults[]): ValidationSummary {
  const issuesByCategory: Record<IssueCategory, number> = {
    'schema': 0,
    'security': 0,
    'llm-compatibility': 0,
    'naming': 0,
    'best-practice': 0,
  };

  const issuesBySeverity: Record<IssueSeverity, number> = {
    'error': 0,
    'warning': 0,
    'suggestion': 0,
  };

  let validTools = 0;

  for (const result of results) {
    const hasErrors = result.issues.some((i) => i.severity === 'error');
    if (!hasErrors) validTools++;

    for (const issue of result.issues) {
      issuesByCategory[issue.category]++;
      issuesBySeverity[issue.severity]++;
    }
  }

  return {
    totalTools: results.length,
    validTools,
    issuesByCategory,
    issuesBySeverity,
  };
}

/**
 * Flatten all issues from results.
 */
export function flattenIssues(results: ToolRuleResults[]): ValidationIssue[] {
  return results.flatMap((r) => r.issues);
}
