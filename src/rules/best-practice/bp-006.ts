/**
 * BP-006: Use $ref for repeated schema patterns
 *
 * Checks for repeated schema patterns across tools that could use $ref.
 */

import type { Rule, RuleContext } from '../types.js';
import type { ValidationIssue, JSONSchema } from '../../types/index.js';

/**
 * Create a canonical representation of a schema for comparison.
 * Removes order-dependent aspects to enable pattern matching.
 */
function canonicalizeSchema(schema: unknown): string {
  if (schema === null || schema === undefined) {
    return '';
  }

  if (typeof schema !== 'object') {
    return JSON.stringify(schema);
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return JSON.stringify(schema.map(canonicalizeSchema).sort());
  }

  // Handle objects - sort keys for consistent comparison
  const obj = schema as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const canonical: Record<string, string> = {};

  for (const key of sortedKeys) {
    canonical[key] = canonicalizeSchema(obj[key]);
  }

  return JSON.stringify(canonical);
}

/**
 * Check if a schema is complex enough to warrant $ref.
 * Simple types like {type: "string"} don't need $ref.
 */
function isComplexSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }

  const obj = schema as Record<string, unknown>;

  // Must have type to be a meaningful schema
  if (!obj.type) {
    return false;
  }

  // Objects and arrays with nested properties are complex
  if (obj.type === 'object' && obj.properties) {
    return true;
  }

  if (obj.type === 'array' && obj.items) {
    const items = obj.items as Record<string, unknown>;
    // Array of objects is complex
    if (items.type === 'object' && items.properties) {
      return true;
    }
  }

  // Schema with multiple constraints is complex
  const constraintKeys = [
    'properties',
    'items',
    'oneOf',
    'anyOf',
    'allOf',
    'enum',
    'pattern',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'minItems',
    'maxItems',
  ];
  const constraintCount = constraintKeys.filter((k) => k in obj).length;

  return constraintCount >= 2;
}

/**
 * Extract all property schemas from a tool's inputSchema.
 * Returns an array to allow multiple properties with the same schema.
 */
function extractPropertySchemas(
  inputSchema: JSONSchema
): Array<{ canonical: string; path: string; schema: unknown }> {
  const schemas: Array<{ canonical: string; path: string; schema: unknown }> =
    [];

  const properties = inputSchema?.properties;
  if (!properties || typeof properties !== 'object') {
    return schemas;
  }

  for (const [propName, propSchema] of Object.entries(properties)) {
    if (isComplexSchema(propSchema)) {
      const canonical = canonicalizeSchema(propSchema);
      schemas.push({
        canonical,
        path: `inputSchema.properties.${propName}`,
        schema: propSchema,
      });
    }
  }

  return schemas;
}

const rule: Rule = {
  id: 'BP-006',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Use $ref for repeated schema patterns',

  check(tool, ctx: RuleContext) {
    const issues: ValidationIssue[] = [];

    // Build a map of all complex schemas across all tools
    const globalSchemas = new Map<
      string,
      Array<{ tool: string; path: string }>
    >();

    for (const t of ctx.allTools) {
      const schemas = extractPropertySchemas(t.inputSchema);
      for (const schemaInfo of schemas) {
        if (!globalSchemas.has(schemaInfo.canonical)) {
          globalSchemas.set(schemaInfo.canonical, []);
        }
        globalSchemas.get(schemaInfo.canonical)!.push({
          tool: t.name,
          path: schemaInfo.path,
        });
      }
    }

    // Find repeated patterns for the current tool
    const currentSchemas = extractPropertySchemas(tool.inputSchema);
    for (const schemaInfo of currentSchemas) {
      const occurrences = globalSchemas.get(schemaInfo.canonical);
      if (occurrences && occurrences.length > 1) {
        // This schema appears in multiple places
        const otherLocations = occurrences
          .filter(
            (o) => o.tool !== tool.name || o.path !== schemaInfo.path
          )
          .map((o) => (o.tool === tool.name ? o.path : o.tool));

        if (otherLocations.length > 0) {
          issues.push({
            id: 'BP-006',
            category: 'best-practice',
            severity: this.defaultSeverity,
            message: `Schema pattern at ${schemaInfo.path} is repeated in: ${otherLocations.slice(0, 3).join(', ')}${otherLocations.length > 3 ? ` and ${otherLocations.length - 3} more` : ''}`,
            tool: tool.name,
            path: schemaInfo.path,
            suggestion:
              'Consider using $ref to define this schema once and reference it',
          });
        }
      }
    }

    return issues;
  },
};

export default rule;
