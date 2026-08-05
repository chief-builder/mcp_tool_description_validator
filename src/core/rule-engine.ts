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
  IssueProvenance,
  ValidationProfile,
} from '../types/index.js';

const SPECIFICATION_RULES = new Set([
  'SCH-001', 'SCH-002', 'SCH-003', 'SCH-004', 'SCH-005',
  'SCH-009', 'SCH-010', 'SCH-011',
]);

const HEURISTIC_RULES = new Set([
  'NAM-003', 'NAM-004', 'NAM-005', 'NAM-006', 'NAM-008',
  'SEC-004', 'SEC-006', 'SEC-007', 'SEC-010',
]);

/** Classify a rule's authority when it does not declare one explicitly. */
export function getRuleProvenance(rule: Rule): IssueProvenance {
  if (rule.provenance) return rule.provenance;
  if (SPECIFICATION_RULES.has(rule.id)) return 'specification';
  if (rule.id.startsWith('LLM-') || HEURISTIC_RULES.has(rule.id)) {
    return 'heuristic';
  }
  return 'governance';
}

/**
 * Execute all loaded rules against a set of tools.
 */
export function executeRules(
  tools: ToolDefinition[],
  rules: Rule[],
  config: RuleConfig,
  profile: ValidationProfile = 'governance'
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
      const provenance = getRuleProvenance(rule);

      // Rules run over untrusted tool definitions; one pathological tool
      // must not abort the whole run. A crash becomes a finding instead.
      let ruleIssues: ValidationIssue[];
      try {
        ruleIssues = rule.check(tool, ctx);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push({
          id: rule.id,
          category: rule.category,
          severity: 'error',
          provenance: 'governance',
          message: `Rule ${rule.id} failed to execute: ${message}`,
          tool: tool.name,
          suggestion:
            'The tool definition may be malformed (e.g. non-object property schemas or excessive nesting). Other rules still ran.',
        });
        continue;
      }

      // Config may override severity for the whole rule; otherwise keep
      // the severity each issue was emitted with (rules may escalate
      // individual findings above their default severity).
      const configured = config[rule.id];
      const severityOverride =
        typeof configured === 'string' ? configured : undefined;
      for (const issue of ruleIssues) {
        const issueProvenance = issue.provenance ?? provenance;
        const profileSeverity =
          profile === 'compliance' &&
          issueProvenance !== 'specification' &&
          issue.severity === 'error'
            ? 'warning'
            : issue.severity;
        issues.push({
          ...issue,
          provenance: issueProvenance,
          severity: severityOverride ?? profileSeverity,
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
 * Calculate maturity score for a single tool's issues.
 * Starts at 100 and deducts points per issue severity.
 * Floor is 0.
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
  const issuesByProvenance: Record<IssueProvenance, number> = {
    specification: 0,
    governance: 0,
    heuristic: 0,
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
      issuesByProvenance[issue.provenance ?? 'governance']++;
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
    issuesByProvenance,
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
