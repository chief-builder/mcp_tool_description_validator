import chalk, { Chalk } from 'chalk';
import type { ValidationResult } from '../types/index.js';

export interface HumanOutputOptions {
  color?: boolean;
  verbose?: boolean;
}

/**
 * Format validation results for human-readable terminal output
 */
export function formatHumanOutput(result: ValidationResult, options: HumanOutputOptions = {}): string {
  const { color = true, verbose = false } = options;
  const c = color ? chalk : new Chalk({ level: 0 });

  const lines: string[] = [];

  // Header
  lines.push(`MCP Tool Validator v${result.metadata.validatorVersion}`);
  lines.push(c.gray('─'.repeat(50)));
  lines.push('');

  // Source info
  lines.push(`Validating: ${result.tools.length} tool(s)`);
  lines.push('');

  // Per-tool results
  for (const toolResult of result.tools) {
    const hasErrors = toolResult.issues.some(i => i.severity === 'error');
    const icon = hasErrors ? c.red('✗') : c.green('✓');
    lines.push(`${icon} ${toolResult.tool.name}`);

    for (const issue of toolResult.issues) {
      const severityColor = issue.severity === 'error' ? c.red :
                           issue.severity === 'warning' ? c.yellow : c.blue;
      const severityLabel = issue.severity.toUpperCase();

      lines.push(`  ${severityColor(severityLabel)} [${issue.id}] ${issue.message}`);

      if (issue.path) {
        lines.push(`    ${c.gray('at:')} ${issue.path}`);
      }

      if (issue.suggestion && verbose) {
        lines.push(`    ${c.gray('suggestion:')} ${issue.suggestion}`);
      }
    }

    lines.push('');
  }

  // Summary
  lines.push(c.gray('─'.repeat(50)));
  lines.push(`Summary: ${result.summary.validTools}/${result.summary.totalTools} tools valid`);
  lines.push('');

  lines.push(`  Errors:      ${result.summary.issuesBySeverity.error}`);
  lines.push(`  Warnings:    ${result.summary.issuesBySeverity.warning}`);
  lines.push(`  Suggestions: ${result.summary.issuesBySeverity.suggestion}`);
  lines.push('');

  lines.push('  By Category:');
  for (const [category, count] of Object.entries(result.summary.issuesByCategory)) {
    if (count > 0) {
      lines.push(`    ${category}: ${count}`);
    }
  }
  lines.push('');

  // Final status
  if (result.valid) {
    lines.push(c.green('Validation passed.'));
  } else {
    lines.push(c.red(`Validation failed with ${result.summary.issuesBySeverity.error} error(s).`));
  }

  return lines.join('\n');
}
