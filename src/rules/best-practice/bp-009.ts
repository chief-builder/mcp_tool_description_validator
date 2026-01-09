/**
 * BP-009: Consider providing outputSchema for better output validation and parsing
 *
 * Validates that tools provide outputSchema when possible, and that the schema
 * is well-defined with proper types and descriptions.
 *
 * The outputSchema is optional per MCP spec, but providing it improves:
 * - Output validation
 * - LLM parsing of results
 * - Client-side type safety
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/**
 * Check if a value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a JSON Schema property has a description
 */
function hasDescription(schema: Record<string, unknown>): boolean {
  return typeof schema.description === 'string' && schema.description.trim().length > 0;
}

/**
 * Check if a JSON Schema has a type defined
 */
function hasType(schema: Record<string, unknown>): boolean {
  return typeof schema.type === 'string' || Array.isArray(schema.type);
}

/**
 * Count properties with descriptions in an object schema
 */
function countPropertiesWithDescriptions(
  properties: Record<string, unknown>
): { total: number; withDescriptions: number } {
  const entries = Object.entries(properties);
  const total = entries.length;
  const withDescriptions = entries.filter(([, prop]) => {
    return isObject(prop) && hasDescription(prop);
  }).length;
  return { total, withDescriptions };
}

const rule: Rule = {
  id: 'BP-009',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Consider providing outputSchema for better output validation and parsing',
  documentation: 'https://modelcontextprotocol.io/specification/2025-11-25#tools',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const raw = tool.source.raw as Record<string, unknown> | undefined;

    // Check if outputSchema exists
    if (!raw || !('outputSchema' in raw)) {
      issues.push({
        id: 'BP-009',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: 'Tool is missing outputSchema for output validation and parsing',
        tool: tool.name,
        path: 'outputSchema',
        suggestion:
          'Add outputSchema with type, properties, and descriptions to define expected output structure',
        documentation: this.documentation,
      });
      return issues;
    }

    const outputSchema = raw.outputSchema;

    // Validate that outputSchema is an object
    if (!isObject(outputSchema)) {
      issues.push({
        id: 'BP-009',
        category: 'best-practice',
        severity: 'warning',
        message: 'outputSchema must be a valid JSON Schema object',
        tool: tool.name,
        path: 'outputSchema',
        suggestion: 'Provide a valid JSON Schema object with type and properties',
        documentation: this.documentation,
      });
      return issues;
    }

    // Check if outputSchema has a type
    if (!hasType(outputSchema)) {
      issues.push({
        id: 'BP-009',
        category: 'best-practice',
        severity: 'warning',
        message: 'outputSchema is missing "type" property',
        tool: tool.name,
        path: 'outputSchema.type',
        suggestion: 'Add "type": "object" or appropriate type to outputSchema',
        documentation: this.documentation,
      });
    }

    // Check if outputSchema has a description
    if (!hasDescription(outputSchema)) {
      issues.push({
        id: 'BP-009',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: 'outputSchema is missing a description',
        tool: tool.name,
        path: 'outputSchema.description',
        suggestion: 'Add a description to outputSchema explaining the output structure',
        documentation: this.documentation,
      });
    }

    // For object types, check if properties have descriptions
    if (outputSchema.type === 'object' && isObject(outputSchema.properties)) {
      const { total, withDescriptions } = countPropertiesWithDescriptions(
        outputSchema.properties as Record<string, unknown>
      );

      if (total > 0 && withDescriptions === 0) {
        issues.push({
          id: 'BP-009',
          category: 'best-practice',
          severity: this.defaultSeverity,
          message: 'outputSchema properties are missing descriptions',
          tool: tool.name,
          path: 'outputSchema.properties',
          suggestion: 'Add descriptions to outputSchema properties for better LLM understanding',
          documentation: this.documentation,
        });
      } else if (total > 0 && withDescriptions < total) {
        const missingCount = total - withDescriptions;
        issues.push({
          id: 'BP-009',
          category: 'best-practice',
          severity: this.defaultSeverity,
          message: `${missingCount} of ${total} outputSchema properties are missing descriptions`,
          tool: tool.name,
          path: 'outputSchema.properties',
          suggestion: 'Add descriptions to all outputSchema properties for better LLM understanding',
          documentation: this.documentation,
        });
      }
    }

    return issues;
  },
};

export default rule;
