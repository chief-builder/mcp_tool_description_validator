/**
 * NAM-008: Large tool sets benefit from prefix-based namespacing
 *
 * Anthropic's "Writing effective tools for agents" guidance: when a server
 * exposes many tools, grouping related tools under common prefixes
 * (service_resource_action, e.g. asana_projects_search) helps agents pick
 * the right tool and keeps names distinct when multiple servers are
 * aggregated.
 *
 * Heuristic (deliberately conservative): only considered for servers with
 * 10+ tools, and only fires when the names show no grouping structure on
 * either axis — fewer than 30% of tools share their first token with
 * another tool AND fewer than 30% share their last token (verb-suffixed
 * families like read_file/write_file group on the last token). Exactly one
 * finding is emitted per run, attached to the first tool.
 */

import type { Rule, RuleContext } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { tokenizeIdentifier } from '../utils/text.js';

/** Minimum number of tools before namespacing is worth suggesting. */
const MIN_TOOLS = 10;

/** Share of tools that must group on an axis for names to count as structured. */
const STRUCTURE_THRESHOLD = 0.3;

/**
 * Fraction of tools whose token at the given position (first or last) is
 * shared with at least one other tool. Tools with no tokens never share.
 */
function sharedTokenRatio(
  tokenLists: string[][],
  pick: (tokens: string[]) => string | undefined
): number {
  const counts = new Map<string, number>();
  for (const tokens of tokenLists) {
    const token = pick(tokens);
    if (token !== undefined) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  let shared = 0;
  for (const tokens of tokenLists) {
    const token = pick(tokens);
    if (token !== undefined && (counts.get(token) ?? 0) >= 2) {
      shared++;
    }
  }
  return shared / tokenLists.length;
}

const rule: Rule = {
  id: 'NAM-008',
  category: 'naming',
  defaultSeverity: 'suggestion',
  description:
    'Large tool sets should group related tools under common name prefixes',

  check(tool, ctx: RuleContext) {
    const issues: ValidationIssue[] = [];

    if (ctx.allTools.length < MIN_TOOLS) {
      return issues;
    }

    // Emit at most one finding per run, on the first tool only.
    if (ctx.allTools.indexOf(tool) !== 0) {
      return issues;
    }

    const tokenLists = ctx.allTools.map((t) =>
      typeof t.name === 'string' ? tokenizeIdentifier(t.name) : []
    );

    const firstTokenRatio = sharedTokenRatio(tokenLists, (tokens) => tokens[0]);
    const lastTokenRatio = sharedTokenRatio(
      tokenLists,
      (tokens) => tokens[tokens.length - 1]
    );

    // Grouping on either axis (prefix families like asana_*, or suffix
    // families like *_file) counts as structure.
    if (
      firstTokenRatio >= STRUCTURE_THRESHOLD ||
      lastTokenRatio >= STRUCTURE_THRESHOLD
    ) {
      return issues;
    }

    issues.push({
      id: this.id,
      category: this.category,
      severity: this.defaultSeverity,
      message: `Server exposes ${ctx.allTools.length} tools whose names show no common grouping. Prefix-based namespacing helps agents select the right tool and keeps names distinct when servers are aggregated`,
      tool: tool.name,
      path: 'name',
      suggestion:
        'Group related tools under common prefixes, e.g. service_resource_action (asana_projects_search, asana_tasks_create)',
    });

    return issues;
  },
};

export default rule;
