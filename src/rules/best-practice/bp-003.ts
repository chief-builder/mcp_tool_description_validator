/**
 * BP-003: Consider adding destructiveHint for data-modifying tools
 *
 * Checks if tools with names suggesting modification have destructiveHint annotation.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { tokenizeIdentifier } from '../utils/text.js';

/**
 * Verbs that suggest a tool modifies data when they lead the name
 * (e.g. "create-user", "setConfig").
 */
const MODIFYING_VERBS = [
  'create',
  'update',
  'delete',
  'remove',
  'set',
  'add',
  'insert',
  'drop',
  'clear',
  'reset',
  'modify',
  'change',
  'write',
  'destroy',
  'purge',
];

/**
 * Verbs that also suggest modification as the trailing token
 * (e.g. "user-create", "record_update").
 */
const MODIFYING_SUFFIX_VERBS = ['create', 'update', 'delete', 'remove', 'set'];

/**
 * Check if a tool name suggests it modifies data.
 * Matches verbs only as whole tokens so names like "settings_get"
 * or "address_search" are not mistaken for "set"/"add" prefixes.
 */
function isModifyingTool(name: string): boolean {
  const tokens = tokenizeIdentifier(name);
  if (tokens.length === 0) {
    return false;
  }
  return (
    MODIFYING_VERBS.includes(tokens[0]) ||
    MODIFYING_SUFFIX_VERBS.includes(tokens[tokens.length - 1])
  );
}

const rule: Rule = {
  id: 'BP-003',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Consider adding destructiveHint for data-modifying tools',

  check(tool) {
    const issues: ValidationIssue[] = [];

    if (
      isModifyingTool(tool.name) &&
      tool.annotations?.destructiveHint === undefined
    ) {
      issues.push({
        id: 'BP-003',
        category: 'best-practice',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" suggests data modification but is missing destructiveHint annotation`,
        tool: tool.name,
        suggestion:
          'Add annotations.destructiveHint to indicate whether the operation is destructive',
      });
    }

    return issues;
  },
};

export default rule;
