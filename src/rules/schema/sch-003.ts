/**
 * SCH-003: Tool must have an `inputSchema` field
 *
 * Validates that every tool definition includes an inputSchema field.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { isSchemaObject } from '../utils/schema-walker.js';

const rule: Rule = {
  id: 'SCH-003',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'Tool must have an inputSchema field',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    if (!isSchemaObject(tool.inputSchema)) {
      issues.push({
        id: 'SCH-003',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'Tool must include an "inputSchema" JSON Schema object',
        tool: tool.name || '(unnamed)',
        path: 'inputSchema',
        suggestion:
          "Add an inputSchema object defining the tool's input parameters using JSON Schema",
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
