/**
 * SCH-004: `inputSchema` must be valid JSON Schema
 *
 * Validates that the inputSchema field is a valid JSON Schema document
 * that can be compiled by Ajv.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

// Create Ajv instance with lenient settings for validation
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

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

    try {
      // Attempt to compile the schema - this validates its structure
      ajv.compile(tool.inputSchema);
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
