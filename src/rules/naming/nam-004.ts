/**
 * NAM-004: Tool name should not start with numbers
 *
 * Validates that tool names start with a letter, not a number.
 * Starting with numbers makes names harder to read and may cause issues
 * in some programming contexts.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'NAM-004',
  category: 'naming',
  defaultSeverity: 'warning',
  description: 'Tool name should not start with numbers',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if name is empty (handled by NAM-001)
    if (!tool.name || tool.name.trim() === '') {
      return issues;
    }

    if (/^[0-9]/.test(tool.name)) {
      issues.push({
        id: 'NAM-004',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" should not start with a number`,
        tool: tool.name,
        path: 'name',
        suggestion: 'Start the tool name with a descriptive verb or noun instead of a number',
      });
    }

    return issues;
  },
};

export default rule;
