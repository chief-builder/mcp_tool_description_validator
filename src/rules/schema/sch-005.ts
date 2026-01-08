/**
 * SCH-005: `inputSchema.type` must be "object"
 *
 * Validates that the inputSchema has type: "object" as required by MCP.
 * Tool inputs must be an object to support named parameters.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SCH-005',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'inputSchema.type must be "object"',
  documentation: 'https://modelcontextprotocol.io/specification/2025-11-25#tools',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if inputSchema is missing (caught by SCH-003)
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return issues;
    }

    const schemaType = (tool.inputSchema as Record<string, unknown>).type;

    if (schemaType !== 'object') {
      issues.push({
        id: 'SCH-005',
        category: 'schema',
        severity: this.defaultSeverity,
        message: schemaType
          ? `inputSchema.type is "${schemaType}" but must be "object"`
          : 'inputSchema is missing required "type" field (must be "object")',
        tool: tool.name || '(unnamed)',
        path: 'inputSchema.type',
        suggestion: 'Set inputSchema.type to "object" - MCP tool inputs must be objects with named parameters',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
