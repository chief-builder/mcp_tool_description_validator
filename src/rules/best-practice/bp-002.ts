/**
 * BP-002: Consider adding readOnlyHint annotation
 *
 * Checks if tool has a readOnlyHint annotation to indicate whether it modifies state.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'BP-002',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Consider adding readOnlyHint annotation',

  check(tool) {
    const issues: ValidationIssue[] = [];

    if (tool.annotations?.readOnlyHint === undefined) {
      issues.push({
        id: 'BP-002',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: 'Tool is missing readOnlyHint annotation',
        tool: tool.name,
        suggestion:
          'Add annotations.readOnlyHint to indicate whether the tool only reads data',
      });
    }

    return issues;
  },
};

export default rule;
