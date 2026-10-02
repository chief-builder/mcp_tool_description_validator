/**
 * LLM-004: Tool description should explain WHEN to use the tool
 *
 * Validates that the description contains conditional phrases
 * that help the LLM understand when to select this tool.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { makeWordMatcher } from '../utils/text.js';

// Phrases that indicate when to use the tool. Only genuinely conditional
// phrasing counts: bare 'to '/'for ' (and 'use this to', which restates
// WHAT, not WHEN) match virtually every description and are excluded.
// Matched as whole words/phrases, not substrings.
const WHEN_PHRASES = [
  'when',
  'whenever',
  'if you',
  'if the',
  'if a',
  'if an',
  'for cases where',
  'use this for',
  'used for',
  'useful for',
  'designed for',
  'intended for',
  'meant for',
  'best for',
  'ideal for',
  'suitable for',
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
];

const hasWhenPhraseMatcher = makeWordMatcher(WHEN_PHRASES);

const rule: Rule = {
  id: 'LLM-004',
  category: 'llm-compatibility',
  defaultSeverity: 'warning',
  description: 'Tool description should explain WHEN to use the tool',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if description is empty (handled by LLM-001)
    if (
      typeof tool.description !== 'string' ||
      tool.description.trim() === ''
    ) {
      return issues;
    }

    const hasWhenPhrase = hasWhenPhraseMatcher(tool.description);

    if (!hasWhenPhrase) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: 'Tool description does not explain when to use this tool',
        tool: tool.name,
        path: 'description',
        suggestion:
          'Add context about when to use this tool (e.g., "Use this when...", "Useful for...")',
      });
    }

    return issues;
  },
};

export default rule;
