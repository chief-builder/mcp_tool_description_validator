import chalk, { Chalk } from 'chalk';
import type { ValidationResult, MaturityLevel } from '../types/index.js';

export interface HumanOutputOptions {
  color?: boolean;
  verbose?: boolean;
  /** Only show error-severity issues and the pass/fail status. */
  quiet?: boolean;
}

// C0/C1 control characters (including ESC and CSI). Tool names, messages
// and LLM text come from untrusted definitions or servers and must not be
// able to emit terminal escape sequences.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

/** Replace control characters in untrusted text with U+FFFD. */
export function sanitizeForTerminal(text: string): string {
  return text.replace(CONTROL_CHARS, '\uFFFD');
}

/**
 * Get the appropriate color function for a maturity level.
 */
function getMaturityColor(level: MaturityLevel, c: typeof chalk): (text: string) => string {
  switch (level) {
    case 'exemplary':
      return c.green;
    case 'mature':
      return c.cyan;
    case 'moderate':
      return c.yellow;
    case 'immature':
      return c.red;
  }
}

/**
 * Get a human-readable description for a maturity level.
 */
function getMaturityDescription(level: MaturityLevel): string {
  switch (level) {
    case 'exemplary':
      return 'Optimized for advanced multi-tool agents';
    case 'mature':
      return 'Reliable for complex workflows';
    case 'moderate':
      return 'Usable in simple agents; some guidance';
    case 'immature':
      return 'High risk of misuse; basic functionality only';
  }
}

/**
 * Format validation results for human-readable terminal output
 */
export function formatHumanOutput(result: ValidationResult, options: HumanOutputOptions = {}): string {
  const { color = true, verbose = false, quiet = false } = options;
  const c = color ? chalk : new Chalk({ level: 0 });
  const safe = (text: unknown) => sanitizeForTerminal(String(text));

  const lines: string[] = [];

  // Header
  lines.push(`MCP Tool Validator v${result.metadata.validatorVersion}`);
  lines.push(c.gray('─'.repeat(50)));
  lines.push('');

  // Source info
  lines.push(`Validating: ${result.tools.length} tool(s)`);
  if (!quiet) {
    lines.push(`Profile: ${result.metadata.validationProfile ?? 'governance'}`);
    lines.push(`Validation spec: ${result.metadata.mcpSpecVersion}`);
    if (result.metadata.discoverySpecVersion) {
      lines.push(`Discovery spec: ${result.metadata.discoverySpecVersion}`);
    }
  }
  lines.push('');

  // Per-tool results
  for (const toolResult of result.tools) {
    const hasErrors = toolResult.issues.some(i => i.severity === 'error');
    const icon = hasErrors ? c.red('✗') : c.green('✓');
    lines.push(`${icon} ${safe(toolResult.tool.name)}`);

    for (const issue of toolResult.issues) {
      if (quiet && issue.severity !== 'error') continue;
      const severityColor = issue.severity === 'error' ? c.red :
                           issue.severity === 'warning' ? c.yellow : c.blue;
      const severityLabel = issue.severity.toUpperCase();

      const provenance = (issue.provenance ?? 'governance').toUpperCase();
      lines.push(
        `  ${severityColor(severityLabel)} [${issue.id}] [${provenance}] ${safe(issue.message)}`
      );

      if (issue.path) {
        lines.push(`    ${c.gray('at:')} ${safe(issue.path)}`);
      }

      if (issue.suggestion && verbose) {
        lines.push(`    ${c.gray('suggestion:')} ${safe(issue.suggestion)}`);
      }
    }

    if (toolResult.llmAnalysis && !quiet) {
      const llm = toolResult.llmAnalysis;
      lines.push(
        `  ${c.gray('LLM:')} clarity ${safe(llm.clarity_score)}/10, completeness ${safe(llm.completeness_score)}/10`
      );
      if (verbose) {
        for (const suggestion of llm.suggestions) {
          lines.push(`    ${c.gray('llm suggestion:')} ${safe(suggestion)}`);
        }
      }
    }

    lines.push('');
  }

  // Summary
  lines.push(c.gray('─'.repeat(50)));
  lines.push(`Summary: ${result.summary.validTools}/${result.summary.totalTools} tools valid`);
  lines.push('');

  lines.push(`  Errors:      ${result.summary.issuesBySeverity.error}`);
  if (quiet) {
    lines.push('');
    pushStatus(lines, result, c);
    return lines.join('\n');
  }
  lines.push(`  Warnings:    ${result.summary.issuesBySeverity.warning}`);
  lines.push(`  Suggestions: ${result.summary.issuesBySeverity.suggestion}`);
  if (result.summary.issuesByProvenance) {
    lines.push('');
    lines.push('  By Provenance:');
    for (const [provenance, count] of Object.entries(
      result.summary.issuesByProvenance
    )) {
      lines.push(`    ${provenance}: ${count}`);
    }
  }
  lines.push('');

  lines.push('  By Category:');
  for (const [category, count] of Object.entries(result.summary.issuesByCategory)) {
    if (count > 0) {
      lines.push(`    ${category}: ${count}`);
    }
  }
  lines.push('');

  // Maturity assessment
  const maturityColor = getMaturityColor(result.summary.maturityLevel, c);
  const maturityDescription = getMaturityDescription(result.summary.maturityLevel);
  lines.push(`Maturity: ${maturityColor(result.summary.maturityLevel.toUpperCase())} (${result.summary.maturityScore}/100)`);
  lines.push(`  ${c.gray(maturityDescription)}`);
  lines.push('');

  if (result.metadata.llmAnalysisError) {
    lines.push(
      c.yellow(`LLM analysis failed: ${safe(result.metadata.llmAnalysisError)}`)
    );
    lines.push('');
  }

  pushStatus(lines, result, c);

  return lines.join('\n');
}

/** Append the compliance and governance pass/fail lines. */
function pushStatus(
  lines: string[],
  result: ValidationResult,
  c: typeof chalk
): void {
  lines.push(
    result.compliant === false
      ? c.red('MCP specification compliance failed.')
      : c.green('MCP specification compliance passed.')
  );
  if (result.valid) {
    lines.push(c.green('Governance threshold passed.'));
  } else {
    lines.push(
      c.red(
        `Governance threshold failed with ${result.summary.issuesBySeverity.error} error(s).`
      )
    );
  }
}
