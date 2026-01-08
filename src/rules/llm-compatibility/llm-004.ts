/**
 * LLM-004: Tool description should explain WHEN to use the tool
 *
 * Validates that the description contains conditional phrases
 * that help the LLM understand when to select this tool.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

// Phrases that indicate when to use the tool
const WHEN_PHRASES = [
  'when',
  'if ',
  'use this to',
  'use this for',
  'use this when',
  'used to',
  'used for',
  'used when',
  'useful for',
  'useful when',
  'helps to',
  'helps with',
  'for ',
  'in order to',
  'to ',
  'allows you to',
  'enables',
  'lets you',
  'designed for',
  'intended for',
  'meant for',
  'best for',
  'ideal for',
  'suitable for',
  'appropriate when',
  'recommended when',
  'should be used',
  'can be used',
  'typically used',
  'commonly used',
  'primarily used',
  'mainly used',
  'often used',
  'especially useful',
  'particularly useful',
  'helpful for',
  'helpful when',
];

const rule: Rule = {
  id: 'LLM-004',
  category: 'llm-compatibility',
  defaultSeverity: 'warning',
  description: 'Tool description should explain WHEN to use the tool',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if description is empty (handled by LLM-001)
    if (!tool.description || tool.description.trim() === '') {
      return issues;
    }

    const descLower = tool.description.toLowerCase();
    const hasWhenPhrase = WHEN_PHRASES.some(phrase => descLower.includes(phrase));

    if (!hasWhenPhrase) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: 'Tool description does not explain when to use this tool',
        tool: tool.name,
        path: 'description',
        suggestion: 'Add context about when to use this tool (e.g., "Use this when...", "Useful for...")',
      });
    }

    return issues;
  },
};

export default rule;
