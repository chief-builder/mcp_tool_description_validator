/**
 * BP-003: Consider adding destructiveHint for data-modifying tools
 *
 * Checks if tools with names suggesting modification have destructiveHint annotation.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/**
 * Patterns that suggest a tool modifies data.
 */
const MODIFYING_PATTERNS = [
  /^create/i,
  /^update/i,
  /^delete/i,
  /^remove/i,
  /^set/i,
  /^add/i,
  /^insert/i,
  /^drop/i,
  /^clear/i,
  /^reset/i,
  /^modify/i,
  /^change/i,
  /^write/i,
  /^destroy/i,
  /^purge/i,
  /-create$/i,
  /-update$/i,
  /-delete$/i,
  /-remove$/i,
  /-set$/i,
];

/**
 * Check if a tool name suggests it modifies data.
 */
function isModifyingTool(name: string): boolean {
  return MODIFYING_PATTERNS.some((pattern) => pattern.test(name));
}

const rule: Rule = {
  id: 'BP-003',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Consider adding destructiveHint for data-modifying tools',

  check(tool) {
    const issues: ValidationIssue[] = [];

    if (
      isModifyingTool(tool.name) &&
      tool.annotations?.destructiveHint === undefined
    ) {
      issues.push({
        id: 'BP-003',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" suggests data modification but is missing destructiveHint annotation`,
        tool: tool.name,
        suggestion:
          'Add annotations.destructiveHint to indicate whether the operation is destructive',
      });
    }

    return issues;
  },
};

export default rule;
