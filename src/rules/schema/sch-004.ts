/**
 * SCH-004: Tool schemas must be valid JSON Schema
 *
 * Validates inputSchema and, when present, outputSchema as JSON Schema.
 *
 * Per the MCP spec, the default dialect (no $schema field) is JSON Schema
 * 2020-12. An explicit $schema may select draft-07 instead. Unknown
 * dialects are reported as unsupported rather than validated incorrectly.
 */

import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import {
  isSchemaObject,
  MAX_SCHEMA_DEPTH,
  MAX_SCHEMA_NODES,
  walkSchema,
} from '../utils/schema-walker.js';

// Lenient settings; addUsedSchema:false so two tools sharing an $id do not
// collide in Ajv's schema cache ("schema with key or id already exists").
const AJV_OPTIONS = {
  strict: false,
  allErrors: true,
  addUsedSchema: false,
} as const;

// Default dialect per the MCP spec: JSON Schema 2020-12.
const ajv2020 = new Ajv2020(AJV_OPTIONS);
addFormats(ajv2020);

// Used when the schema explicitly declares draft-07.
const ajvDraft07 = new Ajv(AJV_OPTIONS);
addFormats(ajvDraft07);

const DRAFT_2020_12_URIS = new Set([
  'https://json-schema.org/draft/2020-12/schema',
  'https://json-schema.org/draft/2020-12/schema#',
]);

const DRAFT_07_URIS = new Set([
  'http://json-schema.org/draft-07/schema#',
  'http://json-schema.org/draft-07/schema',
  'https://json-schema.org/draft-07/schema#',
  'https://json-schema.org/draft-07/schema',
]);

type SchemaField = 'inputSchema' | 'outputSchema';

function validateSchema(
  field: SchemaField,
  value: unknown,
  toolName: string
): ValidationIssue[] {
  const documentation =
    'https://modelcontextprotocol.io/specification/2026-07-28/basic/index#json-schema-usage';

  if (!isSchemaObject(value)) {
    return [{
      id: 'SCH-004',
      category: 'schema',
      severity: 'error',
      message: `${field} must be a JSON Schema object`,
      tool: toolName,
      path: field,
      suggestion: `Provide ${field} as a valid JSON Schema object`,
      documentation,
    }];
  }

  const declaredDialect = value.$schema;
  const withinResourceBounds = walkSchema(value, () => {}, {
    rootPath: field,
    maxDepth: MAX_SCHEMA_DEPTH,
    maxNodes: MAX_SCHEMA_NODES,
  });
  if (!withinResourceBounds) {
    return [{
      id: 'SCH-004',
      category: 'schema',
      severity: 'error',
      message: `${field} exceeds validator resource limits (${MAX_SCHEMA_DEPTH} levels or ${MAX_SCHEMA_NODES} subschemas)`,
      tool: toolName,
      path: field,
      suggestion: 'Reduce schema nesting or the number of composed subschemas',
      documentation,
    }];
  }

  let validator: Ajv;
  if (declaredDialect === undefined) {
    validator = ajv2020;
  } else if (
    typeof declaredDialect === 'string' &&
    DRAFT_2020_12_URIS.has(declaredDialect)
  ) {
    validator = ajv2020;
  } else if (
    typeof declaredDialect === 'string' &&
    DRAFT_07_URIS.has(declaredDialect)
  ) {
    validator = ajvDraft07;
  } else {
    return [{
      id: 'SCH-004',
      category: 'schema',
      severity: 'error',
      message: `${field} declares unsupported JSON Schema dialect: ${JSON.stringify(declaredDialect)}`,
      tool: toolName,
      path: `${field}.$schema`,
      suggestion:
        'Use JSON Schema 2020-12 (the MCP default; omit $schema) or draft-07 (http://json-schema.org/draft-07/schema#)',
      documentation,
    }];
  }

  try {
    validator.compile(value);
    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown schema error';
    return [{
      id: 'SCH-004',
      category: 'schema',
      severity: 'error',
      message: `${field} is not valid JSON Schema: ${errorMessage}`,
      tool: toolName,
      path: field,
      suggestion: 'Review the JSON Schema specification and fix the schema syntax errors',
      documentation,
    }];
  }
}

const rule: Rule = {
  id: 'SCH-004',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'inputSchema and outputSchema must be valid JSON Schema',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/basic/index#json-schema-usage',

  check(tool, _ctx) {
    const toolName = typeof tool.name === 'string' && tool.name
      ? tool.name
      : '(unnamed)';
    const issues: ValidationIssue[] = [];

    // SCH-003 owns missing/non-object inputSchema diagnostics.
    if (isSchemaObject(tool.inputSchema)) {
      issues.push(...validateSchema('inputSchema', tool.inputSchema, toolName));
    }

    const raw = tool as unknown as Record<string, unknown>;
    if (raw.outputSchema !== undefined) {
      issues.push(...validateSchema('outputSchema', raw.outputSchema, toolName));
    }

    return issues;
  },
};

export default rule;
