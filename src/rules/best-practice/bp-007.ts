/**
 * BP-007: Deeply nested schemas (>4 levels) hurt usability
 *
 * Checks schema depth and warns if it exceeds 4 levels.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue, JSONSchema } from '../../types/index.js';

/**
 * Maximum recommended schema depth.
 */
const MAX_DEPTH = 4;

/**
 * Calculate the maximum depth of a JSON schema.
 * Depth is counted by nesting levels through properties and items.
 */
function getSchemaDepth(schema: unknown, depth: number = 0): number {
  if (!schema || typeof schema !== 'object') {
    return depth;
  }

  const obj = schema as Record<string, unknown>;
  let maxDepth = depth;

  // Check properties (object type)
  if (obj.properties && typeof obj.properties === 'object') {
    for (const prop of Object.values(obj.properties)) {
      maxDepth = Math.max(maxDepth, getSchemaDepth(prop, depth + 1));
    }
  }

  // Check items (array type)
  if (obj.items) {
    maxDepth = Math.max(maxDepth, getSchemaDepth(obj.items, depth + 1));
  }

  // Check additionalProperties if it's a schema
  if (
    obj.additionalProperties &&
    typeof obj.additionalProperties === 'object'
  ) {
    maxDepth = Math.max(
      maxDepth,
      getSchemaDepth(obj.additionalProperties, depth + 1)
    );
  }

  // Check oneOf/anyOf/allOf
  for (const key of ['oneOf', 'anyOf', 'allOf']) {
    const subSchemas = obj[key];
    if (Array.isArray(subSchemas)) {
      for (const subSchema of subSchemas) {
        maxDepth = Math.max(maxDepth, getSchemaDepth(subSchema, depth));
      }
    }
  }

  return maxDepth;
}

/**
 * Find the path to the deepest nesting point.
 */
function findDeepestPath(
  schema: unknown,
  currentPath: string = 'inputSchema',
  depth: number = 0,
  targetDepth: number = 0
): string {
  if (!schema || typeof schema !== 'object') {
    return currentPath;
  }

  const obj = schema as Record<string, unknown>;

  // Check properties
  if (obj.properties && typeof obj.properties === 'object') {
    for (const [propName, prop] of Object.entries(obj.properties)) {
      const propDepth = getSchemaDepth(prop, depth + 1);
      if (propDepth >= targetDepth) {
        const deeperPath = findDeepestPath(
          prop,
          `${currentPath}.properties.${propName}`,
          depth + 1,
          targetDepth
        );
        if (
          deeperPath.split('.').length > currentPath.split('.').length ||
          propDepth === targetDepth
        ) {
          return deeperPath;
        }
      }
    }
  }

  // Check items
  if (obj.items) {
    const itemsDepth = getSchemaDepth(obj.items, depth + 1);
    if (itemsDepth >= targetDepth) {
      return findDeepestPath(
        obj.items,
        `${currentPath}.items`,
        depth + 1,
        targetDepth
      );
    }
  }

  return currentPath;
}

const rule: Rule = {
  id: 'BP-007',
  category: 'best-practice',
  defaultSeverity: 'warning',
  description: 'Deeply nested schemas (>4 levels) hurt usability',

  check(tool) {
    const issues: ValidationIssue[] = [];

    const depth = getSchemaDepth(tool.inputSchema);

    if (depth > MAX_DEPTH) {
      const deepestPath = findDeepestPath(
        tool.inputSchema,
        'inputSchema',
        0,
        depth
      );

      issues.push({
        id: 'BP-007',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: `Schema has ${depth} levels of nesting which exceeds the recommended limit of ${MAX_DEPTH}`,
        tool: tool.name,
        path: deepestPath,
        suggestion:
          'Consider flattening the schema or breaking it into separate tools',
      });
    }

    return issues;
  },
};

export default rule;
