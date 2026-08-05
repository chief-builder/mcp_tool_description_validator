/**
 * SEC-007: Sensitive parameter names should be flagged
 *
 * Parameters with names suggesting sensitive data (password, token,
 * key, secret) should be flagged for review. These parameters require
 * special handling and security considerations.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';
import { makeWordMatcher, tokenizeIdentifier } from '../utils/text.js';

/**
 * Terms that suggest a parameter contains sensitive data. Matched as
 * whole tokens/phrases (camelCase and snake_case aware), so "apiKey"
 * and "api_key" match but "author" does not match "auth".
 */
const SENSITIVE_NAME_TERMS = [
  'password',
  'passwd',
  'token',
  'secret',
  'api key',
  'apikey',
  'auth',
  'credential',
  'credentials',
  'private key',
  'access key',
];

const matchesSensitiveTerm = makeWordMatcher(SENSITIVE_NAME_TERMS);

export function isSensitiveParameter(name: string): boolean {
  const tokens = tokenizeIdentifier(name);
  // Pagination tokens are opaque continuation cursors, not credentials.
  if (
    tokens.includes('cursor') ||
    (tokens.includes('page') && tokens.includes('token'))
  ) {
    return false;
  }
  return matchesSensitiveTerm(name);
}

const rule: Rule = {
  id: 'SEC-007',
  category: 'security',
  defaultSeverity: 'warning',
  description:
    'Sensitive parameter names (password, token, key, secret) should be flagged',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    // Cover nested schemas too (properties inside objects/arrays)
    const propertyEntries = getAllPropertyEntries(tool.inputSchema);

    for (const { name, path } of propertyEntries) {
      if (isSensitiveParameter(name)) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${name}' appears to contain sensitive data`,
          tool: tool.name,
          path,
          suggestion:
            'Ensure this parameter is handled securely: avoid logging, use secure transmission, and consider if it should be passed at runtime instead of stored',
        });
      }
    }

    return issues;
  },
};

export default rule;
