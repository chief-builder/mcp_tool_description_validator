/**
 * SCH-001: Tool must have a `name` field
 *
 * Validates that every tool definition includes a non-empty name field.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SCH-001',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'Tool must have a name field',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    if (typeof tool.name !== 'string' || tool.name.trim() === '') {
      issues.push({
        id: 'SCH-001',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'Tool must include a non-empty string "name" field',
        tool:
          typeof tool.name === 'string' && tool.name ? tool.name : '(unnamed)',
        path: 'name',
        suggestion:
          'Add a descriptive name for the tool (e.g., "get-user-profile")',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
