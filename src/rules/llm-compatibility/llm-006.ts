/**
 * LLM-006: Each parameter must have a description
 *
 * Validates that all parameters defined in inputSchema.properties
 * have descriptions to help the LLM understand their purpose.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

interface PropertySchema {
  description?: string;
  [key: string]: unknown;
}

const rule: Rule = {
  id: 'LLM-006',
  category: 'llm-compatibility',
  defaultSeverity: 'error',
  description: 'Each parameter must have a description',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') {
      return issues;
    }

    const properties = schema.properties as Record<string, PropertySchema> | undefined;
    if (!properties || typeof properties !== 'object') {
      return issues;
    }

    for (const [paramName, paramSchema] of Object.entries(properties)) {
      if (!paramSchema || typeof paramSchema !== 'object') {
        continue;
      }

      const description = paramSchema.description;
      if (!description || (typeof description === 'string' && description.trim() === '')) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${paramName}' is missing a description`,
          tool: tool.name,
          path: `inputSchema.properties.${paramName}.description`,
          suggestion: `Add a description to the '${paramName}' parameter explaining its purpose and expected values`,
        });
      }
    }

    return issues;
  },
};

export default rule;
