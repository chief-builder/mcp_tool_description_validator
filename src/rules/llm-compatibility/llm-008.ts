/**
 * LLM-008: Avoid ambiguous terms without context
 *
 * Validates that parameter names and descriptions avoid generic terms
 * like "data", "value", "input" without providing context.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { tokenizeIdentifier } from '../utils/text.js';

// Generic terms that need context
const AMBIGUOUS_TERMS = [
  'data',
  'value',
  'input',
  'output',
  'info',
  'stuff',
  'thing',
  'item',
  'object',
  'result',
  'response',
  'payload',
  'content',
  'body',
  'param',
  'arg',
  'argument',
  'parameter',
  'var',
  'variable',
  'prop',
  'property',
  'field',
  'attr',
  'attribute',
  'opts',
  'options',
  'config',
  'settings',
  'details',
  'misc',
  'other',
  'extra',
  'additional',
  'temp',
  'tmp',
  'foo',
  'bar',
  'baz',
  'test',
];

// Contextual words that make a term less ambiguous. Only genuinely
// disambiguating domain words belong here: overbroad entries like
// 'to', 'from', 'type', or 'set' would make every description count
// as context and the rule would never fire.
const CONTEXT_INDICATORS = [
  'user',
  'file',
  'path',
  'url',
  'name',
  'id',
  'email',
  'phone',
  'address',
  'date',
  'time',
  'status',
  'format',
  'size',
  'count',
  'number',
  'amount',
  'price',
  'quantity',
  'index',
  'offset',
  'limit',
  'page',
  'query',
  'filter',
  'sort',
  'search',
  'message',
  'text',
  'title',
  'label',
  'tag',
  'category',
  'key',
  'token',
  'secret',
  'password',
  'credential',
  'auth',
  'session',
  'error',
  'code',
  'source',
  'target',
  'destination',
  'origin',
];

// Precomputed sets for token lookups (avoids per-check regex construction)
const AMBIGUOUS_TERM_SET = new Set(AMBIGUOUS_TERMS);
const CONTEXT_INDICATOR_SET = new Set(CONTEXT_INDICATORS);

interface PropertySchema {
  description?: string;
  [key: string]: unknown;
}

function hasContext(text: string): boolean {
  // Tokenize so camelCase/snake_case identifiers are matched word-wise
  return tokenizeIdentifier(text).some((token) =>
    CONTEXT_INDICATOR_SET.has(token)
  );
}

function findAmbiguousTerms(text: string): string[] {
  // Tokenize so terms inside identifiers are found
  // (e.g. 'data' in 'user_data' or 'payloadData')
  const found = new Set<string>();

  for (const token of tokenizeIdentifier(text)) {
    if (AMBIGUOUS_TERM_SET.has(token)) {
      found.add(token);
    }
  }

  return [...found];
}

const rule: Rule = {
  id: 'LLM-008',
  category: 'llm-compatibility',
  defaultSeverity: 'warning',
  description:
    'Avoid ambiguous terms (e.g., "data", "value", "input") without context',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') {
      return issues;
    }

    const properties = schema.properties as
      Record<string, PropertySchema> | undefined;
    if (!properties || typeof properties !== 'object') {
      return issues;
    }

    for (const [paramName, paramSchema] of Object.entries(properties)) {
      if (!paramSchema || typeof paramSchema !== 'object') {
        continue;
      }

      const description = paramSchema.description;

      // Check parameter name for ambiguous terms
      const nameTerms = findAmbiguousTerms(paramName);

      // Check if description provides context
      // Also include tool name as context - e.g., write_file.content is clear
      const descriptionText =
        typeof description === 'string' ? description : '';
      const combinedContext = `${tool.name} ${paramName} ${descriptionText}`;

      if (nameTerms.length > 0 && !hasContext(combinedContext)) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${paramName}' uses ambiguous term(s): ${nameTerms.join(', ')}`,
          tool: tool.name,
          path: `inputSchema.properties.${paramName}`,
          suggestion: `Use more specific names like 'userData', 'configValue', or add context in the description`,
        });
      }

      // Check description for standalone ambiguous terms
      if (descriptionText) {
        const descTerms = findAmbiguousTerms(descriptionText);
        // Only flag if description uses ambiguous terms AND lacks context
        if (descTerms.length > 0 && !hasContext(descriptionText)) {
          issues.push({
            id: this.id,
            category: this.category,
            severity: this.defaultSeverity,
            message: `Parameter '${paramName}' description uses ambiguous term(s) without context: ${descTerms.join(', ')}`,
            tool: tool.name,
            path: `inputSchema.properties.${paramName}.description`,
            suggestion: `Clarify what kind of ${descTerms[0]} is expected (e.g., "user data", "configuration value")`,
          });
        }
      }
    }

    return issues;
  },
};

export default rule;
