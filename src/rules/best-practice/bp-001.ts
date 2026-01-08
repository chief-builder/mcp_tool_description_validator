/**
 * BP-001: Consider adding title annotation for display purposes
 *
 * Checks if tool has a title annotation for better UI display.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'BP-001',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Consider adding title annotation for display purposes',

  check(tool) {
    const issues: ValidationIssue[] = [];

    if (!tool.annotations?.title) {
      issues.push({
        id: 'BP-001',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: 'Tool is missing title annotation for display purposes',
        tool: tool.name,
        suggestion: 'Add annotations.title with a human-friendly name',
      });
    }

    return issues;
  },
};

export default rule;
