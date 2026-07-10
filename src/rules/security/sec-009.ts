/**
 * SEC-009: Object parameters with additionalProperties: true need justification
 *
 * Objects that accept additional properties beyond those defined
 * in the schema can be a security risk as they may allow injection
 * of unexpected data. This should be explicitly justified.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import {
  getAllPropertyEntries,
  isSchemaObject,
} from '../utils/schema-walker.js';

const rule: Rule = {
  id: 'SEC-009',
  category: 'security',
  defaultSeverity: 'warning',
  description: 'Object parameters with additionalProperties: true need justification',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // The root inputSchema is itself an object schema; an open root
    // accepts arbitrary injected arguments. Only flag when the root
    // declares properties (a bare { type: "object" } no-params schema is
    // covered by the parameterless-shape best-practice rule).
    if (
      isSchemaObject(tool.inputSchema) &&
      tool.inputSchema.type === 'object' &&
      isSchemaObject(tool.inputSchema.properties) &&
      Object.keys(tool.inputSchema.properties).length > 0 &&
      (tool.inputSchema.additionalProperties === true ||
        tool.inputSchema.additionalProperties === undefined)
    ) {
      // Suggestion, not warning: omitting root additionalProperties is
      // near-universal in real servers, but closing it is safer.
      issues.push({
        id: this.id,
        category: this.category,
        severity: 'suggestion',
        message: 'inputSchema allows additional top-level properties',
        tool: tool.name,
        path: 'inputSchema',
        suggestion:
          'Add "additionalProperties": false to the root inputSchema to prevent unexpected arguments',
      });
    }

    // Cover nested schemas too (properties inside objects/arrays)
    const propertyEntries = getAllPropertyEntries(tool.inputSchema);

    for (const { name, schema, path } of propertyEntries) {
      if (schema.type === 'object') {
        // Check if additionalProperties is true or not set (defaults to true in JSON Schema)
        const allowsAdditional =
          schema.additionalProperties === true ||
          schema.additionalProperties === undefined;

        if (allowsAdditional) {
          issues.push({
            id: this.id,
            category: this.category,
            severity: this.defaultSeverity,
            message: `Object parameter '${name}' allows additional properties`,
            tool: tool.name,
            path,
            suggestion:
              'Consider adding "additionalProperties": false to prevent unexpected properties, or document why additional properties are needed',
          });
        }
      }
    }

    return issues;
  },
};

export default rule;
