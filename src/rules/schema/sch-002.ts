/**
 * SCH-002: Tool `description` must be a string when provided
 *
 * The 2026-07-28 MCP schema makes description optional, but requires a
 * string when it is present. LLM-001 separately recommends a description.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SCH-002',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'Tool description must be a string when provided',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    if (
      tool.description !== undefined &&
      typeof tool.description !== 'string'
    ) {
      issues.push({
        id: 'SCH-002',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'Tool "description" must be a string when provided',
        tool: tool.name || '(unnamed)',
        path: 'description',
        suggestion: 'Remove description or provide it as a string',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
