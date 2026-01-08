/**
 * SEC-009: Object parameters with additionalProperties: true need justification
 *
 * Objects that accept additional properties beyond those defined
 * in the schema can be a security risk as they may allow injection
 * of unexpected data. This should be explicitly justified.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SEC-009',
  category: 'security',
  defaultSeverity: 'warning',
  description: 'Object parameters with additionalProperties: true need justification',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, schema] of Object.entries(properties)) {
      if (schema.type === 'object') {
        // Check if additionalProperties is true or not set (defaults to true in JSON Schema)
        const allowsAdditional =
          schema.additionalProperties === true ||
          schema.additionalProperties === undefined;

        if (allowsAdditional) {
          issues.push({
            id: this.id,
            category: this.category,
            severity: this.defaultSeverity,
            message: `Object parameter '${name}' allows additional properties`,
            tool: tool.name,
            path: `inputSchema.properties.${name}`,
            suggestion:
              'Consider adding "additionalProperties": false to prevent unexpected properties, or document why additional properties are needed',
          });
        }
      }
    }

    return issues;
  },
};

export default rule;
