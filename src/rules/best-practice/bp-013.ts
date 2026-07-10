/**
 * BP-013: Collection tools should support pagination or filtering
 *
 * Anthropic's "Writing effective tools for agents" guidance: tools that
 * return collections can blow up an agent's context window when nothing
 * bounds the response. Collection-returning tools should accept pagination
 * (limit/cursor) and/or filtering parameters with sensible defaults.
 *
 * Heuristic: a tool counts as a collection tool when its name starts with
 * a listing verb (list/search/query/find/browse) or its description uses a
 * collection phrase ("returns a list", "returns all", ...). It passes when
 * any input parameter name contains a pagination- or filtering-style token.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { getAllPropertyEntries } from '../utils/schema-walker.js';
import { tokenizeIdentifier, makeWordMatcher } from '../utils/text.js';

/** Leading name tokens that mark a tool as collection-returning. */
const LISTING_VERBS = new Set(['list', 'search', 'query', 'find', 'browse']);

/** Description phrases that indicate a collection-returning tool. */
const COLLECTION_PHRASES = [
  'returns a list',
  'returns all',
  'lists all',
  'all items',
  'every',
];

/** Parameter name tokens that bound or filter the response. */
const BOUNDING_TOKENS = new Set([
  'limit',
  'count',
  'max',
  'size',
  'page',
  'cursor',
  'offset',
  'top',
  'first',
  'last',
  'filter',
  'query',
  'since',
  'until',
  'before',
  'after',
]);

const mentionsCollection = makeWordMatcher(COLLECTION_PHRASES);

const rule: Rule = {
  id: 'BP-013',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description:
    'Collection tools should support pagination or filtering parameters',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    const firstToken =
      typeof tool.name === 'string'
        ? tokenizeIdentifier(tool.name)[0]
        : undefined;
    const description =
      typeof tool.description === 'string' ? tool.description : '';

    const isCollectionTool =
      (firstToken !== undefined && LISTING_VERBS.has(firstToken)) ||
      mentionsCollection(description);
    if (!isCollectionTool) {
      return issues;
    }

    // Any pagination/filtering-style parameter at any depth passes.
    const hasBoundingParam = getAllPropertyEntries(tool.inputSchema).some(
      (entry) =>
        tokenizeIdentifier(entry.name).some((token) =>
          BOUNDING_TOKENS.has(token)
        )
    );
    if (hasBoundingParam) {
      return issues;
    }

    issues.push({
      id: this.id,
      category: this.category,
      severity: this.defaultSeverity,
      message:
        'Tool appears to return a collection but has no pagination or filtering parameters. Large unpaginated responses can blow up agent context windows',
      tool: tool.name,
      path: 'inputSchema',
      suggestion:
        'Add pagination (e.g. "limit" and "cursor") and/or filtering parameters with sensible defaults so agents can bound the response size',
    });

    return issues;
  },
};

export default rule;
