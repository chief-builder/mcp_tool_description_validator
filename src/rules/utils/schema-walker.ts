/**
 * Shared schema traversal utilities for validation rules.
 *
 * Tool definitions come from untrusted sources; every accessor here is
 * null-safe and every traversal is depth-bounded so a pathological schema
 * (deeply nested, null property values, cyclic references from library
 * callers) cannot crash the validator. The MCP specification requires
 * validators to apply resource bounds when processing composition keywords.
 */

/** Maximum schema nesting depth any rule will traverse. */
export const MAX_SCHEMA_DEPTH = 50;

/** True when the value is a plain object (a candidate JSON Schema node). */
export function isSchemaObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Top-level parameter entries of a schema's `properties`.
 * Entries whose value is not a plain object are skipped — malformed or
 * hostile definitions may contain null/array/primitive property values.
 */
export function getPropertyEntries(
  schema: unknown
): Array<[string, Record<string, unknown>]> {
  if (!isSchemaObject(schema)) return [];
  const properties = schema.properties;
  if (!isSchemaObject(properties)) return [];
  return Object.entries(properties).filter(
    (entry): entry is [string, Record<string, unknown>] =>
      isSchemaObject(entry[1])
  );
}

/** A named property schema found anywhere in a schema tree. */
export interface NamedPropertyEntry {
  /** The property name */
  name: string;
  /** The property's schema (always a plain object) */
  schema: Record<string, unknown>;
  /** Dotted path to the property schema, e.g. `inputSchema.properties.user.properties.id` */
  path: string;
}

/**
 * Every named property schema at any nesting depth (bounded), including
 * properties inside array `items` and composition keywords. Use instead of
 * getPropertyEntries when a rule should also cover nested schemas.
 */
export function getAllPropertyEntries(
  schema: unknown,
  options: WalkOptions = {}
): NamedPropertyEntry[] {
  const entries: NamedPropertyEntry[] = [];
  walkSchema(
    schema,
    (visit) => {
      if (visit.propertyName !== undefined) {
        entries.push({
          name: visit.propertyName,
          schema: visit.schema,
          path: visit.path,
        });
      }
    },
    options
  );
  return entries;
}

/** A schema node reached during a walk. */
export interface SchemaVisit {
  /** The schema node itself */
  schema: Record<string, unknown>;
  /** Dotted path from the walk root, e.g. `inputSchema.properties.user` */
  path: string;
  /** Nesting depth (walk root = 0) */
  depth: number;
  /** Set when this node is the schema of a named property */
  propertyName?: string;
}

export interface WalkOptions {
  maxDepth?: number;
  /** Path prefix for reported paths (default: "inputSchema") */
  rootPath?: string;
}

const SINGLE_SUBSCHEMA_KEYS = [
  'items',
  'additionalProperties',
  'not',
  'if',
  'then',
  'else',
  'contains',
  'propertyNames',
] as const;

const LIST_SUBSCHEMA_KEYS = ['prefixItems', 'anyOf', 'oneOf', 'allOf'] as const;

/**
 * Depth-bounded walk over a JSON Schema. Visits the root and every subschema
 * reachable via `properties`, array keywords, composition keywords, and
 * `$defs`. Returns `false` when the walk was truncated by the depth bound.
 */
export function walkSchema(
  root: unknown,
  visit: (node: SchemaVisit) => void,
  options: WalkOptions = {}
): boolean {
  const maxDepth = options.maxDepth ?? MAX_SCHEMA_DEPTH;
  let truncated = false;

  const walk = (
    node: unknown,
    path: string,
    depth: number,
    propertyName?: string
  ): void => {
    if (!isSchemaObject(node)) return;
    if (depth > maxDepth) {
      truncated = true;
      return;
    }

    visit({ schema: node, path, depth, propertyName });

    if (isSchemaObject(node.properties)) {
      for (const [name, child] of Object.entries(node.properties)) {
        walk(child, `${path}.properties.${name}`, depth + 1, name);
      }
    }
    for (const key of SINGLE_SUBSCHEMA_KEYS) {
      if (key in node) {
        walk(node[key], `${path}.${key}`, depth + 1);
      }
    }
    for (const key of LIST_SUBSCHEMA_KEYS) {
      const list = node[key];
      if (Array.isArray(list)) {
        list.forEach((child, index) =>
          walk(child, `${path}.${key}[${index}]`, depth + 1)
        );
      }
    }
    if (isSchemaObject(node.$defs)) {
      for (const [name, child] of Object.entries(node.$defs)) {
        walk(child, `${path}.$defs.${name}`, depth + 1);
      }
    }
  };

  walk(root, options.rootPath ?? 'inputSchema', 0);
  return !truncated;
}
