/**
 * SEC-004: File path parameters must use pattern for path validation
 *
 * File path parameters without proper validation can lead to
 * path traversal attacks and unauthorized file access. Use regex
 * patterns to enforce safe paths.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/** Patterns that suggest a parameter is a file path */
const PATH_NAME_PATTERNS = [
  /path/i,
  /file/i,
  /dir/i,
  /directory/i,
  /folder/i,
  /filename/i,
];

function isFilePathParameter(name: string): boolean {
  return PATH_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

const rule: Rule = {
  id: 'SEC-004',
  category: 'security',
  defaultSeverity: 'error',
  description: 'File path parameters must use pattern for path validation',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, schema] of Object.entries(properties)) {
      if (
        schema.type === 'string' &&
        isFilePathParameter(name) &&
        schema.pattern === undefined
      ) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `File path parameter '${name}' is missing pattern constraint for path validation`,
          tool: tool.name,
          path: `inputSchema.properties.${name}`,
          suggestion:
            'Add a "pattern" constraint to validate path format and prevent path traversal attacks (e.g., "^[a-zA-Z0-9_\\-./]+$")',
        });
      }
    }

    return issues;
  },
};

export default rule;
