/**
 * BP-004: Consider adding idempotentHint annotation
 *
 * Checks if tool has an idempotentHint annotation to indicate whether it's safe to retry.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'BP-004',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Consider adding idempotentHint annotation',

  check(tool) {
    const issues: ValidationIssue[] = [];

    if (tool.annotations?.idempotentHint === undefined) {
      issues.push({
        id: 'BP-004',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: 'Tool is missing idempotentHint annotation',
        tool: tool.name,
        suggestion:
          'Add annotations.idempotentHint to indicate whether the tool is safe to call multiple times',
      });
    }

    return issues;
  },
};

export default rule;
