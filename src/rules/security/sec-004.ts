/**
 * SEC-004: File path parameters must use pattern for path validation
 *
 * File path parameters without proper validation can lead to
 * path traversal attacks and unauthorized file access. Use regex
 * patterns to enforce safe paths.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';
import { tokenizeIdentifier } from '../utils/text.js';

/** Tokens that suggest a parameter is a file path */
const PATH_NAME_TOKENS = new Set([
  'path',
  'filepath',
  'file',
  'filename',
  'dir',
  'directory',
  'folder',
]);

/**
 * Check whole tokens only, so "profile", "direction", or "redirect"
 * are not mistaken for "file"/"dir" substrings.
 */
function isFilePathParameter(name: string): boolean {
  const tokens = tokenizeIdentifier(name);
  // Opaque resource identifiers such as fileId and folder_id are not paths.
  if (tokens.at(-1) === 'id' || tokens.at(-1) === 'identifier') return false;
  return tokens.some((token) => PATH_NAME_TOKENS.has(token));
}

const rule: Rule = {
  id: 'SEC-004',
  category: 'security',
  defaultSeverity: 'error',
  description: 'File path parameters must use pattern for path validation',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    // Cover nested schemas too (properties inside objects/arrays)
    const propertyEntries = getAllPropertyEntries(tool.inputSchema);

    for (const { name, schema, path } of propertyEntries) {
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
          path,
          suggestion:
            'Add a "pattern" constraint to validate path format and prevent path traversal attacks (e.g., "^[a-zA-Z0-9_\\-./]+$")',
        });
      }
    }

    return issues;
  },
};

export default rule;
