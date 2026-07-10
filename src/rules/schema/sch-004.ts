/**
 * SCH-004: `inputSchema` must be valid JSON Schema
 *
 * Validates that the inputSchema field is a valid JSON Schema document
 * that can be compiled by Ajv.
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

const rule: Rule = {
  id: 'SCH-004',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'inputSchema must be valid JSON Schema',
  documentation: 'https://json-schema.org/draft/2020-12/json-schema-core',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if inputSchema is missing (caught by SCH-003)
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return issues;
    }

    const schema = tool.inputSchema as Record<string, unknown>;
    const declaredDialect = schema.$schema;

    // Pick the validator for the declared dialect (default: 2020-12).
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
      issues.push({
        id: 'SCH-004',
        category: 'schema',
        severity: this.defaultSeverity,
        message: `inputSchema declares unsupported JSON Schema dialect: ${JSON.stringify(declaredDialect)}`,
        tool: tool.name || '(unnamed)',
        path: 'inputSchema.$schema',
        suggestion:
          'Use JSON Schema 2020-12 (the MCP default; omit $schema) or draft-07 (http://json-schema.org/draft-07/schema#)',
        documentation: this.documentation,
      });
      return issues;
    }

    try {
      // Attempt to compile the schema - this validates its structure
      validator.compile(schema);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown schema error';
      issues.push({
        id: 'SCH-004',
        category: 'schema',
        severity: this.defaultSeverity,
        message: `inputSchema is not valid JSON Schema: ${errorMessage}`,
        tool: tool.name || '(unnamed)',
        path: 'inputSchema',
        suggestion: 'Review the JSON Schema specification and fix the schema syntax errors',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
