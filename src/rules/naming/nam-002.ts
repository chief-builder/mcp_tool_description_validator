/**
 * NAM-002: Tool name must use kebab-case format
 *
 * Validates that tool names follow kebab-case naming convention.
 * Valid: get-user, create-file, list-items
 * Invalid: getUser, get_user, GetUser, GET-USER
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/**
 * Regex for kebab-case validation.
 * - Must start with lowercase letter
 * - Can contain lowercase letters, numbers
 * - Segments separated by single hyphens
 */
const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const rule: Rule = {
  id: 'NAM-002',
  category: 'naming',
  defaultSeverity: 'error',
  description: 'Tool name must use kebab-case format',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if name is empty (handled by NAM-001)
    if (!tool.name || tool.name.trim() === '') {
      return issues;
    }

    if (!KEBAB_CASE_REGEX.test(tool.name)) {
      issues.push({
        id: 'NAM-002',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" must use kebab-case format`,
        tool: tool.name,
        path: 'name',
        suggestion: `Use kebab-case format: "${toKebabCase(tool.name)}"`,
      });
    }

    return issues;
  },
};

/**
 * Convert a string to kebab-case for suggestions.
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase -> camel-Case
    .replace(/[\s_]+/g, '-') // spaces and underscores -> hyphens
    .replace(/--+/g, '-') // multiple hyphens -> single
    .toLowerCase();
}

export default rule;
