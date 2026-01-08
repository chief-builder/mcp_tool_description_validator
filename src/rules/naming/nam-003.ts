/**
 * NAM-003: Tool name should be 3-50 characters
 *
 * Validates that tool names are within a reasonable length range.
 * Too short names lack descriptiveness, too long names are hard to use.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const MIN_LENGTH = 3;
const MAX_LENGTH = 50;

const rule: Rule = {
  id: 'NAM-003',
  category: 'naming',
  defaultSeverity: 'warning',
  description: 'Tool name should be 3-50 characters',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if name is empty (handled by NAM-001)
    if (!tool.name || tool.name.trim() === '') {
      return issues;
    }

    const length = tool.name.length;

    if (length < MIN_LENGTH) {
      issues.push({
        id: 'NAM-003',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" is too short (${length} characters). Should be at least ${MIN_LENGTH} characters.`,
        tool: tool.name,
        path: 'name',
        suggestion: 'Use a more descriptive name that clearly indicates the tool\'s purpose',
      });
    } else if (length > MAX_LENGTH) {
      issues.push({
        id: 'NAM-003',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" is too long (${length} characters). Should be at most ${MAX_LENGTH} characters.`,
        tool: tool.name,
        path: 'name',
        suggestion: 'Use a shorter, more concise name while keeping it descriptive',
      });
    }

    return issues;
  },
};

export default rule;
