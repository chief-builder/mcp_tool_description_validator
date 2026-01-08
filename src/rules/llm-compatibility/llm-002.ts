/**
 * LLM-002: Tool description should be 20-500 characters
 *
 * Validates that tool descriptions are neither too short (lacking detail)
 * nor too long (overwhelming for LLM context).
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const MIN_LENGTH = 20;
const MAX_LENGTH = 500;

const rule: Rule = {
  id: 'LLM-002',
  category: 'llm-compatibility',
  defaultSeverity: 'warning',
  description: 'Tool description should be 20-500 characters',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if description is empty (handled by LLM-001)
    if (!tool.description || tool.description.trim() === '') {
      return issues;
    }

    const length = tool.description.trim().length;

    if (length < MIN_LENGTH) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: `Tool description is too short (${length} characters, minimum ${MIN_LENGTH})`,
        tool: tool.name,
        path: 'description',
        suggestion: `Expand the description to at least ${MIN_LENGTH} characters with details about what the tool does and when to use it`,
      });
    } else if (length > MAX_LENGTH) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: `Tool description is too long (${length} characters, maximum ${MAX_LENGTH})`,
        tool: tool.name,
        path: 'description',
        suggestion: `Shorten the description to under ${MAX_LENGTH} characters while keeping essential information`,
      });
    }

    return issues;
  },
};

export default rule;
