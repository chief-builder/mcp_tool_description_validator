/**
 * BP-014: Large-output tools should offer response-format control
 *
 * Anthropic's "Writing effective tools for agents" guidance: tools whose
 * responses can be verbose should let the agent choose how much detail to
 * receive (e.g. a response_format enum of "concise" | "detailed").
 * Anthropic measured roughly a 3x token difference between concise and
 * detailed responses for the same tool.
 *
 * Heuristic: the description signals potentially large output (whole-word
 * match on full/complete/detailed/...) and no input parameter name
 * contains a format-control token.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';
import { tokenizeIdentifier, makeWordMatcher } from '../utils/text.js';

/** Whole words that indicate potentially large/verbose output. */
const LARGE_OUTPUT_TERMS = [
  'full',
  'complete',
  'detailed',
  'everything',
  'entire',
  'history',
  'logs',
  'contents',
  'dump',
];

/** Parameter name tokens that give the agent control over output size. */
const FORMAT_TOKENS = new Set([
  'format',
  'verbosity',
  'detail',
  'concise',
  'fields',
  'include',
]);

const mentionsLargeOutput = makeWordMatcher(LARGE_OUTPUT_TERMS);

const rule: Rule = {
  id: 'BP-014',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description:
    'Large-output tools should expose a response-format control parameter',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    const description =
      typeof tool.description === 'string' ? tool.description : '';
    if (!mentionsLargeOutput(description)) {
      return issues;
    }

    const hasFormatParam = getAllPropertyEntries(tool.inputSchema).some(
      (entry) =>
        tokenizeIdentifier(entry.name).some((token) =>
          FORMAT_TOKENS.has(token)
        )
    );
    if (hasFormatParam) {
      return issues;
    }

    issues.push({
      id: this.id,
      category: this.category,
      severity: this.defaultSeverity,
      message:
        'Tool description suggests potentially large output, but there is no parameter to control the response format or level of detail',
      tool: tool.name,
      path: 'inputSchema',
      suggestion:
        'Expose a response_format enum (e.g. "concise" | "detailed") so agents can control token cost — Anthropic measured a ~3x token difference between the two',
    });

    return issues;
  },
};

export default rule;
