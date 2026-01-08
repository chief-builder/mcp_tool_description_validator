/**
 * NAM-001: Tool name must be non-empty
 *
 * Validates that tool names are provided and not empty.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'NAM-001',
  category: 'naming',
  defaultSeverity: 'error',
  description: 'Tool name must be non-empty',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    if (!tool.name || tool.name.trim() === '') {
      issues.push({
        id: 'NAM-001',
        category: 'naming',
        severity: this.defaultSeverity,
        message: 'Tool name must be non-empty',
        tool: tool.name || '(unnamed)',
        path: 'name',
        suggestion: 'Provide a descriptive kebab-case name for the tool',
      });
    }

    return issues;
  },
};

export default rule;
