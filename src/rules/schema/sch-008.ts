/**
 * SCH-008: Parameters in `required` must exist in `properties`
 *
 * Validates that every parameter name listed in the required array
 * corresponds to a property defined in properties.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SCH-008',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'Parameters in required must exist in properties',
  documentation: 'https://json-schema.org/understanding-json-schema/reference/object#required',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if inputSchema is missing (caught by SCH-003)
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return issues;
    }

    const schema = tool.inputSchema as Record<string, unknown>;
    const properties = schema.properties as Record<string, unknown> | undefined;
    const required = schema.required;

    // Skip if required is not an array
    if (!Array.isArray(required)) {
      return issues;
    }

    // Get the set of property names (empty if properties is missing/invalid)
    const propertyNames = new Set(
      properties && typeof properties === 'object' ? Object.keys(properties) : []
    );

    // Check each required parameter
    for (const requiredParam of required) {
      if (typeof requiredParam !== 'string') {
        issues.push({
          id: 'SCH-008',
          category: 'schema',
          severity: this.defaultSeverity,
          message: `inputSchema.required contains non-string value: ${JSON.stringify(requiredParam)}`,
          tool: tool.name || '(unnamed)',
          path: 'inputSchema.required',
          suggestion: 'Ensure all values in the required array are strings representing property names',
          documentation: this.documentation,
        });
        continue;
      }

      if (!propertyNames.has(requiredParam)) {
        issues.push({
          id: 'SCH-008',
          category: 'schema',
          severity: this.defaultSeverity,
          message: `Required parameter "${requiredParam}" is not defined in properties`,
          tool: tool.name || '(unnamed)',
          path: `inputSchema.required`,
          suggestion: `Either add "${requiredParam}" to inputSchema.properties or remove it from required`,
          documentation: this.documentation,
        });
      }
    }

    return issues;
  },
};

export default rule;
