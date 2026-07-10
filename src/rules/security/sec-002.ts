/**
 * SEC-002: Array parameters must have maxItems constraint
 *
 * Unbounded arrays can lead to memory exhaustion and denial of
 * service attacks. All array parameters should define a maximum
 * number of items.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';

const rule: Rule = {
  id: 'SEC-002',
  category: 'security',
  defaultSeverity: 'error',
  description: 'Array parameters must have maxItems constraint',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    // Cover nested schemas too (properties inside objects/arrays)
    const propertyEntries = getAllPropertyEntries(tool.inputSchema);

    for (const { name, schema, path } of propertyEntries) {
      if (schema.type === 'array' && schema.maxItems === undefined) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Array parameter '${name}' is missing maxItems constraint`,
          tool: tool.name,
          path,
          suggestion: 'Add "maxItems": 100 or an appropriate limit',
        });
      }
    }

    return issues;
  },
};

export default rule;
