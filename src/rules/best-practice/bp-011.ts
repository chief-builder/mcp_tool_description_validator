/**
 * BP-011: Parameterless tools should reject unexpected arguments
 *
 * For tools that take no parameters, the MCP spec recommends
 * { "type": "object", "additionalProperties": false } so the schema
 * explicitly accepts only empty objects. A bare { "type": "object" }
 * is valid but silently accepts any arguments.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { isSchemaObject } from '../utils/schema-walker.js';

const rule: Rule = {
  id: 'BP-011',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Parameterless tools should set additionalProperties: false',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const schema = tool.inputSchema;

    // Missing/malformed inputSchema is handled by schema rules
    if (!isSchemaObject(schema)) {
      return issues;
    }

    if (schema.type !== 'object') {
      return issues;
    }

    // Only applies to parameterless tools: no properties, or an empty
    // properties object
    const properties = schema.properties;
    const hasProperties =
      isSchemaObject(properties) && Object.keys(properties).length > 0;
    if (properties !== undefined && !isSchemaObject(properties)) {
      return issues; // malformed; other rules cover this
    }
    if (hasProperties) {
      return issues;
    }

    if (schema.additionalProperties !== false) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message:
          'Parameterless tool accepts arbitrary arguments. The spec recommends { "type": "object", "additionalProperties": false } so only empty objects are accepted',
        tool: tool.name,
        path: 'inputSchema',
        suggestion:
          'Set "additionalProperties": false on the inputSchema to explicitly accept only empty objects',
      });
    }

    return issues;
  },
};

export default rule;
