/**
 * SEC-010: Parameters accepting code/scripts should be documented as dangerous
 *
 * Parameters that accept executable code or scripts are inherently
 * dangerous and should be clearly documented as such. This includes
 * parameters for eval, exec, script, or code execution.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/** Patterns that suggest a parameter accepts code or scripts */
const CODE_NAME_PATTERNS = [
  /^script$/i,
  /^code$/i,
  /^eval$/i,
  /^exec$/i,
  /^execute$/i,
  /^command$/i,
  /^cmd$/i,
  /^shell$/i,
  /^expression$/i,
  /^query$/i,
  /^sql$/i,
  /^javascript$/i,
  /^python$/i,
  /^bash$/i,
];

function isCodeParameter(name: string): boolean {
  return CODE_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

const rule: Rule = {
  id: 'SEC-010',
  category: 'security',
  defaultSeverity: 'warning',
  description: 'Parameters accepting code/scripts should be documented as dangerous',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const properties =
      (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) || {};

    for (const [name, schema] of Object.entries(properties)) {
      if (isCodeParameter(name)) {
        // Check if the description mentions the security implications
        const description = (schema.description as string) || '';
        const hasSecurityWarning =
          /danger|warning|security|caution|risk|unsafe|untrusted/i.test(description);

        if (!hasSecurityWarning) {
          issues.push({
            id: this.id,
            category: this.category,
            severity: this.defaultSeverity,
            message: `Parameter '${name}' appears to accept code/scripts but lacks security documentation`,
            tool: tool.name,
            path: `inputSchema.properties.${name}`,
            suggestion:
              'Add a description that clearly documents the security implications of accepting code/script input',
          });
        }
      }
    }

    return issues;
  },
};

export default rule;
