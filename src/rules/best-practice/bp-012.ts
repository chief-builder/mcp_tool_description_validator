/**
 * BP-012: Stateful handle lifetime should be documented
 *
 * Non-normative MCP guidance: servers needing cross-call state should
 * return an explicit handle from a creation tool and accept it on later
 * calls, and the handle's retention policy/lifetime SHOULD be stated in
 * the creation tool's description (e.g. "baskets expire after 24 hours
 * of inactivity").
 *
 * Heuristic (deliberately conservative): fires only when a tool whose
 * name starts with a creation verb clearly produces a handle-like value
 * (mentioned in its outputSchema or description) that a sibling tool
 * consumes as a required, same-named input parameter — and the creating
 * tool's description says nothing about the handle's lifetime.
 */

import type { Rule } from '../types.js';
import type { ToolDefinition, ValidationIssue } from '../../types/index.js';
import {
  getPropertyEntries,
  getAllPropertyEntries,
  isSchemaObject,
} from '../utils/schema-walker.js';
import {
  tokenizeIdentifier,
  makeWordMatcher,
  findWordMatches,
} from '../utils/text.js';

/** Verbs whose leading token marks a tool as a creation tool. */
const CREATION_VERBS = new Set([
  'create',
  'open',
  'start',
  'begin',
  'init',
  'new',
]);

/** Tokens that mark a parameter name as a handle-like value. */
const HANDLE_TOKENS = new Set(['id', 'handle', 'token', 'session']);

/** Words that indicate the description documents a lifetime/retention. */
const LIFETIME_TERMS = [
  'expire',
  'expires',
  'expired',
  'expiry',
  'expiration',
  'ttl',
  'lifetime',
  'retention',
  'valid for',
  'persist',
  'persists',
  'until',
];

const mentionsLifetime = makeWordMatcher(LIFETIME_TERMS);

/** True when the identifier contains a handle-like token. */
function isHandleLikeName(name: string): boolean {
  return tokenizeIdentifier(name).some((token) => HANDLE_TOKENS.has(token));
}

/** True when the creating tool's output or description mentions the name. */
function toolProducesHandle(
  tool: ToolDefinition,
  handleName: string
): boolean {
  // outputSchema property with the exact same name, at any depth
  const outputEntries = getAllPropertyEntries(tool.outputSchema, {
    rootPath: 'outputSchema',
  });
  if (outputEntries.some((entry) => entry.name === handleName)) {
    return true;
  }

  // Token-aware mention in the description ("session_id" matches
  // "Returns a session ID")
  if (typeof tool.description === 'string') {
    return findWordMatches(tool.description, [handleName]).length > 0;
  }
  return false;
}

const rule: Rule = {
  id: 'BP-012',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description:
    'Creation tools returning a handle should document its lifetime',

  check(tool, ctx) {
    const issues: ValidationIssue[] = [];

    const firstToken = tokenizeIdentifier(tool.name)[0];
    if (!firstToken || !CREATION_VERBS.has(firstToken)) {
      return issues;
    }

    // Handle names consumed by sibling tools as required inputs
    const consumedHandles = new Set<string>();
    for (const sibling of ctx.allTools) {
      if (sibling === tool || sibling.name === tool.name) continue;
      if (!isSchemaObject(sibling.inputSchema)) continue;

      const required = Array.isArray(sibling.inputSchema.required)
        ? sibling.inputSchema.required
        : [];

      for (const [name] of getPropertyEntries(sibling.inputSchema)) {
        if (!required.includes(name)) continue;
        if (!isHandleLikeName(name)) continue;
        if (toolProducesHandle(tool, name)) {
          consumedHandles.add(name);
        }
      }
    }

    if (consumedHandles.size === 0) {
      return issues;
    }

    const description =
      typeof tool.description === 'string' ? tool.description : '';
    if (mentionsLifetime(description)) {
      return issues;
    }

    const handles = [...consumedHandles].sort().join(', ');
    issues.push({
      id: this.id,
      category: this.category,
      severity: this.defaultSeverity,
      message: `Tool appears to create a handle (${handles}) that other tools consume, but its description does not state the handle's lifetime or retention policy`,
      tool: tool.name,
      path: 'description',
      suggestion:
        'Document how long the handle stays valid in the description (e.g. "sessions expire after 24 hours of inactivity")',
    });

    return issues;
  },
};

export default rule;
