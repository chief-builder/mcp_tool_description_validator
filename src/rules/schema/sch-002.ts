/**
 * SCH-002: Tool must have a `description` field
 *
 * Validates that every tool definition includes a non-empty description field.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SCH-002',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'Tool must have a description field',
  documentation: 'https://modelcontextprotocol.io/specification/2025-11-25#tools',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    if (!tool.description || (typeof tool.description === 'string' && tool.description.trim() === '')) {
      issues.push({
        id: 'SCH-002',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'Tool is missing required "description" field',
        tool: tool.name || '(unnamed)',
        path: 'description',
        suggestion: 'Add a clear description explaining what the tool does and when to use it',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
