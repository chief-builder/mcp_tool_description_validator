/**
 * BP-001: Consider adding a title for display purposes
 *
 * Checks if tool has a human-readable display name. The spec-preferred
 * location is the top-level `title` field; `annotations.title` is also
 * accepted (top-level `title` takes precedence for display).
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'BP-001',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Consider adding a title for display purposes',

  check(tool) {
    const issues: ValidationIssue[] = [];

    if (!tool.title && !tool.annotations?.title) {
      issues.push({
        id: 'BP-001',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: 'Tool is missing a title for display purposes',
        tool: tool.name,
        suggestion:
          'Add a top-level `title` field with a human-friendly name (preferred over annotations.title)',
      });
    }

    return issues;
  },
};

export default rule;
