/**
 * SEC-001: String parameters must have maxLength constraint
 *
 * Unbounded string inputs can lead to denial of service attacks
 * and buffer overflow vulnerabilities. All string parameters
 * should define a maximum length constraint.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SEC-001',
  category: 'security',
  defaultSeverity: 'error',
  description: 'String parameters must have maxLength constraint',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, schema] of Object.entries(properties)) {
      if (schema.type === 'string' && schema.maxLength === undefined) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `String parameter '${name}' is missing maxLength constraint`,
          tool: tool.name,
          path: `inputSchema.properties.${name}`,
          suggestion: 'Add "maxLength": 100 or an appropriate limit',
        });
      }
    }

    return issues;
  },
};

export default rule;
