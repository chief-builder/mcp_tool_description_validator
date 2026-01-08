/**
 * BP-008: Provide examples in inputSchema for complex parameters
 *
 * Checks if complex parameters (objects, arrays) have examples.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/**
 * Check if a schema represents a complex type that would benefit from examples.
 */
function isComplexType(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }

  const obj = schema as Record<string, unknown>;
  const type = obj.type;

  // Objects and arrays are complex
  if (type === 'object' || type === 'array') {
    return true;
  }

  // Union types with multiple options are complex
  if (obj.oneOf || obj.anyOf || obj.allOf) {
    return true;
  }

  // Enums with many values benefit from examples
  if (Array.isArray(obj.enum) && obj.enum.length > 3) {
    return true;
  }

  return false;
}

/**
 * Check if a schema has examples defined.
 */
function hasExamples(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }

  const obj = schema as Record<string, unknown>;

  // Check common example properties
  if (obj.examples !== undefined || obj.example !== undefined) {
    return true;
  }

  // Check default as a form of example
  if (obj.default !== undefined) {
    return true;
  }

  return false;
}

const rule: Rule = {
  id: 'BP-008',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Provide examples in inputSchema for complex parameters',

  check(tool) {
    const issues: ValidationIssue[] = [];

    const properties = tool.inputSchema?.properties;
    if (!properties || typeof properties !== 'object') {
      return issues;
    }

    for (const [propName, propSchema] of Object.entries(properties)) {
      if (isComplexType(propSchema) && !hasExamples(propSchema)) {
        issues.push({
          id: 'BP-008',
          category: 'best-practice',
          severity: this.defaultSeverity,
          message: `Complex parameter "${propName}" is missing examples`,
          tool: tool.name,
          path: `inputSchema.properties.${propName}`,
          suggestion: `Add an 'examples' array to help LLMs understand expected values`,
        });
      }
    }

    return issues;
  },
};

export default rule;
