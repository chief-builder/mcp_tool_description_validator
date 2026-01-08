/**
 * SEC-005: URL parameters must use format: "uri"
 *
 * URL parameters without proper format validation can lead to
 * SSRF (Server-Side Request Forgery) attacks and other security
 * vulnerabilities. Use format: "uri" for proper URL validation.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/** Patterns that suggest a parameter is a URL */
const URL_NAME_PATTERNS = [/url/i, /uri/i, /href/i, /link/i, /endpoint/i];

function isUrlParameter(name: string): boolean {
  return URL_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

const rule: Rule = {
  id: 'SEC-005',
  category: 'security',
  defaultSeverity: 'error',
  description: 'URL parameters must use format: "uri"',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, schema] of Object.entries(properties)) {
      if (schema.type === 'string' && isUrlParameter(name) && schema.format !== 'uri') {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `URL parameter '${name}' should use format: "uri" for proper URL validation`,
          tool: tool.name,
          path: `inputSchema.properties.${name}`,
          suggestion: 'Add "format": "uri" to validate URL structure',
        });
      }
    }

    return issues;
  },
};

export default rule;
