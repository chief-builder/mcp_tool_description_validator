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
  documentation: 'https://modelcontextprotocol.io/specification/2025-11-25#tools',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    if (!tool.name || (typeof tool.name === 'string' && tool.name.trim() === '')) {
      issues.push({
        id: 'SCH-001',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'Tool is missing required "name" field',
        tool: tool.name || '(unnamed)',
        path: 'name',
        suggestion: 'Add a descriptive name for the tool using kebab-case (e.g., "get-user-profile")',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
