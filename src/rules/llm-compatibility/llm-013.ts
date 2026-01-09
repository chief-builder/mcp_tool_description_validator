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
    if (!tool.description || tool.description.trim() === '') {
      return issues;
    }

    const descLower = tool.description.toLowerCase();

    // Check for workflow keywords
    const hasWorkflowKeyword = WORKFLOW_KEYWORDS.some(keyword => {
      // Use word boundary check to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(tool.description);
    });

    // Check for workflow patterns
    const hasWorkflowPattern = WORKFLOW_PATTERNS.some(pattern => pattern.test(tool.description));

    // Check for references to other tool names
    const hasToolReference = ctx.allTools.some(otherTool => {
      if (otherTool.name === tool.name) {
        return false; // Skip self-reference
      }
      // Check if the description mentions another tool's name
      const toolNameLower = otherTool.name.toLowerCase();
      return descLower.includes(toolNameLower);
    });

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
