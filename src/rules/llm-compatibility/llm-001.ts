/**
 * LLM-001: Tool description must be non-empty
 *
 * Validates that every tool has a meaningful description
 * that helps LLMs understand the tool's purpose.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'LLM-001',
  category: 'llm-compatibility',
  defaultSeverity: 'error',
  description: 'Tool description must be non-empty',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    if (!tool.description || tool.description.trim() === '') {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: 'Tool description is empty or missing',
        tool: tool.name,
        path: 'description',
        suggestion: 'Add a clear description explaining what this tool does and when to use it',
      });
    }

    return issues;
  },
};

export default rule;
