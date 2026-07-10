/**
 * SEC-006: Command/query parameters should use enum when values are known
 *
 * Parameters that represent commands, actions, or queries should
 * use enum constraints when the set of valid values is known.
 * This prevents injection of unexpected or malicious values.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';

/** Patterns that suggest a parameter represents a command or action */
const COMMAND_NAME_PATTERNS = [
  /^command$/i,
  /^query$/i,
  /^action$/i,
  /^method$/i,
  /^operation$/i,
  /^mode$/i,
  /^type$/i,
  /^kind$/i,
];

function isCommandParameter(name: string): boolean {
  return COMMAND_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

const rule: Rule = {
  id: 'SEC-006',
  category: 'security',
  defaultSeverity: 'warning',
  description: 'Command/query parameters should use enum when values are known',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    // Cover nested schemas too (properties inside objects/arrays)
    const propertyEntries = getAllPropertyEntries(tool.inputSchema);

    for (const { name, schema, path } of propertyEntries) {
      if (
        schema.type === 'string' &&
        isCommandParameter(name) &&
        schema.enum === undefined
      ) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${name}' appears to be a command/action but is missing an enum constraint`,
          tool: tool.name,
          path,
          suggestion:
            'If the valid values are known, add an "enum" array to restrict input to allowed values',
        });
      }
    }

    return issues;
  },
};

export default rule;
