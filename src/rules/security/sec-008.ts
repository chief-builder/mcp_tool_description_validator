/**
 * SEC-008: No default values for security-sensitive parameters
 *
 * Security-sensitive parameters (passwords, tokens, keys, secrets)
 * should never have default values. Default values for credentials
 * are a major security vulnerability.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { isSensitiveParameter } from './sec-007.js';

const rule: Rule = {
  id: 'SEC-008',
  category: 'security',
  defaultSeverity: 'error',
  description: 'No default values for security-sensitive parameters',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, schema] of Object.entries(properties)) {
      if (isSensitiveParameter(name) && schema.default !== undefined) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Security-sensitive parameter '${name}' has a default value`,
          tool: tool.name,
          path: `inputSchema.properties.${name}`,
          suggestion:
            'Remove the default value from this sensitive parameter. Credentials should always be explicitly provided',
        });
      }
    }

    return issues;
  },
};

export default rule;
