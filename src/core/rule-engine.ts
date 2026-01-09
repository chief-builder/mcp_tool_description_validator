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
  MaturityLevel,
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
 * Point deductions per issue severity for maturity scoring.
 */
const SEVERITY_DEDUCTIONS: Record<IssueSeverity, number> = {
  error: 5,
  warning: 2,
  suggestion: 1,
};

/**
 * Determine maturity level from score.
 */
export function getMaturityLevel(score: number): MaturityLevel {
  if (score >= 91) return 'exemplary';
  if (score >= 71) return 'mature';
  if (score >= 41) return 'moderate';
  return 'immature';
}

/**
 * Calculate maturity score from issue severity counts.
 * Starts at 100 and deducts points per issue severity.
 * Floor is 0.
 */
export function calculateMaturityScore(issuesBySeverity: Record<IssueSeverity, number>): number {
  let score = 100;

  score -= issuesBySeverity.error * SEVERITY_DEDUCTIONS.error;
  score -= issuesBySeverity.warning * SEVERITY_DEDUCTIONS.warning;
  score -= issuesBySeverity.suggestion * SEVERITY_DEDUCTIONS.suggestion;

  return Math.max(0, score);
}

/**
 * Calculate maturity score for a single tool's issues.
 */
function calculateToolScore(issues: ValidationIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    score -= SEVERITY_DEDUCTIONS[issue.severity];
  }

  return Math.max(0, score);
}

/**
 * Aggregate results into a validation summary.
 * Uses per-tool averaged scoring for fair comparison across servers.
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
  let totalToolScore = 0;

  for (const result of results) {
    const hasErrors = result.issues.some((i) => i.severity === 'error');
    if (!hasErrors) validTools++;

    // Calculate per-tool score and accumulate for averaging
    totalToolScore += calculateToolScore(result.issues);

    for (const issue of result.issues) {
      issuesByCategory[issue.category]++;
      issuesBySeverity[issue.severity]++;
    }
  }

  // Per-tool averaged maturity score (handles empty results)
  const maturityScore = results.length > 0
    ? Math.round(totalToolScore / results.length)
    : 100;
  const maturityLevel = getMaturityLevel(maturityScore);

  return {
    totalTools: results.length,
    validTools,
    issuesByCategory,
    issuesBySeverity,
    maturityScore,
    maturityLevel,
  };
}

/**
 * Flatten all issues from results.
 */
export function flattenIssues(results: ToolRuleResults[]): ValidationIssue[] {
  return results.flatMap((r) => r.issues);
}
