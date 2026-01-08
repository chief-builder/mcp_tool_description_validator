/**
 * LLM-005: Tool description should include example usage
 *
 * Validates that the description contains examples or illustrations
 * to help the LLM understand how to use the tool.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

// Patterns that indicate example usage
const EXAMPLE_PATTERNS = [
  'example',
  'e.g.',
  'e.g,',
  'eg.',
  'eg:',
  'for instance',
  'for example',
  'such as',
  'like ',
  'including',
  'sample',
  '```',  // Code block
  '"',    // Quoted example
  "'",    // Quoted example
];

// Regex patterns for detecting example-like content
const EXAMPLE_REGEXES = [
  /\b\w+\s*=\s*["'][^"']+["']/,  // key="value" or key='value'
  /\b\w+:\s*["'][^"']+["']/,     // key: "value" or key: 'value'
  /`[^`]+`/,                      // `inline code`
  /\(\s*e\.?g\.?\s+/i,           // (e.g. or (eg
];

const rule: Rule = {
  id: 'LLM-005',
  category: 'llm-compatibility',
  defaultSeverity: 'suggestion',
  description: 'Tool description should include example usage',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if description is empty (handled by LLM-001)
    if (!tool.description || tool.description.trim() === '') {
      return issues;
    }

    const descLower = tool.description.toLowerCase();

    // Check for phrase patterns
    const hasExamplePhrase = EXAMPLE_PATTERNS.some(pattern =>
      descLower.includes(pattern.toLowerCase())
    );

    // Check for regex patterns
    const hasExamplePattern = EXAMPLE_REGEXES.some(regex =>
      regex.test(tool.description)
    );

    if (!hasExamplePhrase && !hasExamplePattern) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: 'Tool description does not include usage examples',
        tool: tool.name,
        path: 'description',
        suggestion: 'Add examples to illustrate usage (e.g., "Example: search-users query=\'john\'")',
      });
    }

    return issues;
  },
};

export default rule;
