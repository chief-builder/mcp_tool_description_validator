/**
 * LLM-013: Tool description should include workflow guidance
 *
 * Validates that the description contains guidance about prerequisites,
 * alternatives, or sequencing to help the LLM understand how to use
 * the tool in context with other tools.
 *
 * Examples of good workflow guidance:
 * - 'Call discover_required_fields first to identify mandatory fields'
 * - 'No user filtering; use search_calls_extensive instead'
 * - 'After creating, use get_status to check progress'
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { findWordMatches, makeWordMatcher } from '../utils/text.js';

// Workflow sequencing keywords
const WORKFLOW_KEYWORDS = [
  'first',
  'before',
  'after',
  'then',
  'instead',
  'alternatively',
  'prerequisite',
  'requires',
  'following',
  'prior to',
  'once',
  'next',
  'finally',
  'subsequently',
  'in advance',
];

// Precompiled whole-word matcher (avoids per-check regex construction)
const hasWorkflowKeywordMatcher = makeWordMatcher(WORKFLOW_KEYWORDS);

// Tool names shorter than this are too generic ('run', 'get') to treat
// a mention in prose as a deliberate cross-tool reference
const MIN_REFERENCED_TOOL_NAME_LENGTH = 4;

// Patterns that suggest tool references and workflow
const WORKFLOW_PATTERNS = [
  /\buse\s+\w+\s+(?:for|to|when)/i, // "use X for", "use X to", "use X when"
  /\bcall\s+\w+\s+(?:to|first|before|after)/i, // "call X to", "call X first"
  /\bsee\s+\w+\s+for/i, // "see X for"
  /\bprefer\s+\w+/i, // "prefer X"
  /\brequires?\s+\w+/i, // "requires X"
  /\brun\s+\w+\s+(?:first|before|after)/i, // "run X first"
  /\binvoke\s+\w+/i, // "invoke X"
];

const rule: Rule = {
  id: 'LLM-013',
  category: 'llm-compatibility',
  defaultSeverity: 'suggestion',
  description: 'Tool description should include workflow guidance (prerequisites, alternatives, sequencing)',

  check(tool, ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if description is empty (handled by LLM-001)
    if (typeof tool.description !== 'string' || tool.description.trim() === '') {
      return issues;
    }

    const description = tool.description;

    // Check for workflow keywords (whole words, precompiled matcher)
    const hasWorkflowKeyword = hasWorkflowKeywordMatcher(description);

    // Check for workflow patterns
    const hasWorkflowPattern = WORKFLOW_PATTERNS.some(pattern => pattern.test(description));

    // Check for references to other tool names, matched as whole words so
    // short names like 'run' or 'get' don't match inside ordinary prose
    const otherToolNames = ctx.allTools
      .map(otherTool => otherTool.name)
      .filter(
        name =>
          name !== tool.name && name.length >= MIN_REFERENCED_TOOL_NAME_LENGTH
      );
    const hasToolReference =
      findWordMatches(description, otherToolNames).length > 0;

    const hasWorkflowGuidance = hasWorkflowKeyword || hasWorkflowPattern || hasToolReference;

    if (!hasWorkflowGuidance) {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: 'Tool description lacks workflow guidance (prerequisites, alternatives, or sequencing)',
        tool: tool.name,
        path: 'description',
        suggestion:
          'Consider adding workflow context like "Call X first to...", "Use Y instead for...", or "After this, use Z to..."',
      });
    }

    return issues;
  },
};

export default rule;
