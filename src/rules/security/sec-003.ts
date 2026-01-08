/**
 * SEC-003: Number parameters should have minimum/maximum constraints
 *
 * Unbounded numeric inputs can lead to integer overflow, resource
 * exhaustion, or unexpected behavior. Number parameters should
 * define reasonable bounds.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SEC-003',
  category: 'security',
  defaultSeverity: 'warning',
  description: 'Number parameters should have minimum/maximum constraints',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, schema] of Object.entries(properties)) {
      if (
        (schema.type === 'number' || schema.type === 'integer') &&
        schema.minimum === undefined &&
        schema.maximum === undefined
      ) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Number parameter '${name}' is missing minimum/maximum constraints`,
          tool: tool.name,
          path: `inputSchema.properties.${name}`,
          suggestion: 'Add "minimum" and/or "maximum" constraints to bound the value',
        });
      }
    }

    return issues;
  },
};

export default rule;
