/**
 * LLM-007: Parameter descriptions should be 10-200 characters
 *
 * Validates that parameter descriptions are neither too short (lacking detail)
 * nor too long (overwhelming for LLM context).
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const MIN_LENGTH = 10;
const MAX_LENGTH = 200;

interface PropertySchema {
  description?: string;
  [key: string]: unknown;
}

const rule: Rule = {
  id: 'LLM-007',
  category: 'llm-compatibility',
  defaultSeverity: 'warning',
  description: 'Parameter descriptions should be 10-200 characters',

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

      // Skip if no description (handled by LLM-006)
      if (!description || typeof description !== 'string') {
        continue;
      }

      const length = description.trim().length;

      if (length < MIN_LENGTH) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${paramName}' description is too short (${length} characters, minimum ${MIN_LENGTH})`,
          tool: tool.name,
          path: `inputSchema.properties.${paramName}.description`,
          suggestion: `Expand the description to at least ${MIN_LENGTH} characters with details about expected values and format`,
        });
      } else if (length > MAX_LENGTH) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${paramName}' description is too long (${length} characters, maximum ${MAX_LENGTH})`,
          tool: tool.name,
          path: `inputSchema.properties.${paramName}.description`,
          suggestion: `Shorten the description to under ${MAX_LENGTH} characters while keeping essential information`,
        });
      }
    }

    return issues;
  },
};

export default rule;
