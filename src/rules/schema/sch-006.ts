/**
 * SCH-006: `inputSchema.properties` should be defined (not empty object)
 *
 * Warns when a tool's inputSchema has no properties defined,
 * which typically indicates a tool that takes no parameters.
 * While valid, this is unusual and worth reviewing.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'SCH-006',
  category: 'schema',
  defaultSeverity: 'warning',
  description: 'inputSchema.properties should be defined (not empty object)',
  documentation: 'https://json-schema.org/understanding-json-schema/reference/object#properties',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if inputSchema is missing (caught by SCH-003)
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return issues;
    }

    const schema = tool.inputSchema as Record<string, unknown>;
    const properties = schema.properties;

    // Check if properties is missing or empty
    if (!properties) {
      issues.push({
        id: 'SCH-006',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'inputSchema is missing "properties" field',
        tool: tool.name || '(unnamed)',
        path: 'inputSchema.properties',
        suggestion: 'Define the tool\'s input parameters in inputSchema.properties, or explicitly document that this tool takes no parameters',
        documentation: this.documentation,
      });
    } else if (typeof properties === 'object' && Object.keys(properties as object).length === 0) {
      issues.push({
        id: 'SCH-006',
        category: 'schema',
        severity: this.defaultSeverity,
        message: 'inputSchema.properties is empty - tool takes no parameters',
        tool: tool.name || '(unnamed)',
        path: 'inputSchema.properties',
        suggestion: 'If this tool intentionally takes no parameters, consider documenting this clearly. Otherwise, define the expected input parameters.',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
