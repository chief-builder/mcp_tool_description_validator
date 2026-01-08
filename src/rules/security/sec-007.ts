/**
 * SEC-007: Sensitive parameter names should be flagged
 *
 * Parameters with names suggesting sensitive data (password, token,
 * key, secret) should be flagged for review. These parameters require
 * special handling and security considerations.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/** Patterns that suggest a parameter contains sensitive data */
const SENSITIVE_NAME_PATTERNS = [
  /password/i,
  /passwd/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /apikey/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
];

export function isSensitiveParameter(name: string): boolean {
  return SENSITIVE_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

const rule: Rule = {
  id: 'SEC-007',
  category: 'security',
  defaultSeverity: 'warning',
  description:
    'Sensitive parameter names (password, token, key, secret) should be flagged',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, _schema] of Object.entries(properties)) {
      if (isSensitiveParameter(name)) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${name}' appears to contain sensitive data`,
          tool: tool.name,
          path: `inputSchema.properties.${name}`,
          suggestion:
            'Ensure this parameter is handled securely: avoid logging, use secure transmission, and consider if it should be passed at runtime instead of stored',
        });
      }
    }

    return issues;
  },
};

export default rule;
