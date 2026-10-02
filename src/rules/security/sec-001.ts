/**
 * SEC-001: String parameters must have maxLength constraint
 *
 * Unbounded string inputs can lead to denial of service attacks
 * and buffer overflow vulnerabilities. All string parameters
 * should define a maximum length constraint.
 *
 * Exceptions: Content fields that legitimately need large text
 * (e.g., content, message, prompt, body, text, code, query).
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';

/**
 * Parameter names that are exempt from maxLength requirement.
 * These typically hold content that legitimately needs to be large.
 */
const CONTENT_FIELD_PATTERNS = [
  // Content/body fields
  /^content$/i,
  /^contents$/i,
  /^body$/i,
  /^text$/i,
  /^message$/i,
  /^messages$/i,
  // LLM/AI fields
  /^prompt$/i,
  /^thought$/i,
  /^thoughts$/i,
  /^input$/i,
  /^output$/i,
  /^response$/i,
  // Code/data fields
  /^code$/i,
  /^script$/i,
  /^source$/i,
  /^data$/i,
  /^payload$/i,
  /^json$/i,
  /^xml$/i,
  /^html$/i,
  /^markdown$/i,
  // Query fields (SQL, GraphQL, etc.)
  /^query$/i,
  /^sql$/i,
  /^graphql$/i,
  // Fields ending with common content suffixes
  /content$/i,
  /body$/i,
  /text$/i,
  /data$/i,
];

/**
 * Check if a parameter name matches a content field pattern.
 */
function isContentField(paramName: string): boolean {
  return CONTENT_FIELD_PATTERNS.some((pattern) => pattern.test(paramName));
}

const rule: Rule = {
  id: 'SEC-001',
  category: 'security',
  defaultSeverity: 'error',
  description:
    'String parameters must have maxLength constraint (except content fields)',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    // Cover nested schemas too (properties inside objects/arrays)
    const propertyEntries = getAllPropertyEntries(tool.inputSchema);

    for (const { name, schema, path } of propertyEntries) {
      // Skip if not a string type
      if (schema.type !== 'string') {
        continue;
      }

      // Skip if maxLength is defined
      if (schema.maxLength !== undefined) {
        continue;
      }

      // Skip content fields that legitimately need large text
      if (isContentField(name)) {
        continue;
      }

      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: `String parameter '${name}' is missing maxLength constraint`,
        tool: tool.name,
        path,
        suggestion: 'Add "maxLength": 100 or an appropriate limit',
      });
    }

    return issues;
  },
};

export default rule;
