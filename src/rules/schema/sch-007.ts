/**
 * SCH-007: Required parameters should be listed in `inputSchema.required`
 *
 * Warns when a tool has properties defined but no required array,
 * suggesting that the developer should explicitly declare which
 * parameters are required vs optional.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SCH-007',
  category: 'schema',
  defaultSeverity: 'warning',
  description: 'Required parameters should be listed in inputSchema.required',
  documentation: 'https://json-schema.org/understanding-json-schema/reference/object#required',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if inputSchema is missing (caught by SCH-003)
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return issues;
    }

    const schema = tool.inputSchema as Record<string, unknown>;
    const properties = schema.properties;
    const required = schema.required;

    // Only check if properties exist and have entries
    if (!properties || typeof properties !== 'object' || Object.keys(properties as object).length === 0) {
      return issues;
    }

    // Check if required is missing or not an array
    if (!required) {
      issues.push({
        id: 'SCH-007',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'inputSchema has properties but no "required" array - all parameters will be optional',
        tool: tool.name || '(unnamed)',
        path: 'inputSchema.required',
        suggestion: 'Add a "required" array listing parameters that must be provided, or leave empty array [] if all are truly optional',
        documentation: this.documentation,
      });
    } else if (!Array.isArray(required)) {
      issues.push({
        id: 'SCH-007',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'inputSchema.required is not an array',
        tool: tool.name || '(unnamed)',
        path: 'inputSchema.required',
        suggestion: 'Change "required" to an array of property names (e.g., ["userId", "action"])',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
