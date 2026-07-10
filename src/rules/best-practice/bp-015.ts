/**
 * BP-015: Overlapping or duplicative tools confuse agents
 *
 * Anthropic's "Writing effective tools for agents" guidance: multiple
 * tools with overlapping purposes make it hard for agents to pick the
 * right one. Prefer consolidating them into a single workflow tool (e.g.
 * schedule_event instead of list_users + list_events + create_event
 * chains) or sharpening each description to say when to use which.
 *
 * Heuristic (deliberately conservative): descriptions are normalized,
 * stopwords dropped, and the remaining token sets compared. Two tools
 * count as overlapping when Jaccard similarity >= 0.75 (both with enough
 * meaningful tokens), or one normalized description strictly contains the
 * other and both have >= 8 meaningful tokens. One finding is reported on
 * the later tool of the pair.
 */

import type { Rule, RuleContext } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { normalizeForMatching } from '../utils/text.js';

/** Jaccard similarity at or above this marks descriptions as overlapping. */
const SIMILARITY_THRESHOLD = 0.75;

/** Minimum meaningful tokens per description for the Jaccard comparison. */
const MIN_TOKENS_JACCARD = 5;

/** Minimum meaningful tokens per description for the containment check. */
const MIN_TOKENS_CONTAINMENT = 8;

/** Words too common to signal shared purpose. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'to',
  'for',
  'and',
  'or',
  'in',
  'on',
  'with',
  'this',
  'that',
  'is',
  'are',
  'be',
  'it',
  'use',
  'when',
  'you',
  'tool',
]);

interface DescriptionProfile {
  /** Meaningful (stopword-free) tokens, in order, joined with spaces. */
  normalized: string;
  /** Unique meaningful tokens. */
  tokens: Set<string>;
}

function profileDescription(description: unknown): DescriptionProfile | null {
  if (typeof description !== 'string') return null;
  const meaningful = normalizeForMatching(description)
    .split(' ')
    .filter((token) => token !== '' && !STOPWORDS.has(token));
  if (meaningful.length === 0) return null;
  return {
    normalized: meaningful.join(' '),
    tokens: new Set(meaningful),
  };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function overlaps(a: DescriptionProfile, b: DescriptionProfile): boolean {
  if (
    a.tokens.size >= MIN_TOKENS_JACCARD &&
    b.tokens.size >= MIN_TOKENS_JACCARD &&
    jaccard(a.tokens, b.tokens) >= SIMILARITY_THRESHOLD
  ) {
    return true;
  }

  if (
    a.tokens.size >= MIN_TOKENS_CONTAINMENT &&
    b.tokens.size >= MIN_TOKENS_CONTAINMENT &&
    a.normalized !== b.normalized
  ) {
    const [shorter, longer] =
      a.normalized.length <= b.normalized.length ? [a, b] : [b, a];
    if (` ${longer.normalized} `.includes(` ${shorter.normalized} `)) {
      return true;
    }
  }

  return false;
}

/**
 * The engine calls check() once per tool with the same allTools array, so
 * cache the pairwise comparison per run instead of redoing it O(n²) per
 * tool. Maps each tool index to the name of the earliest earlier tool it
 * overlaps with (indices without overlap are absent).
 */
const overlapCache = new WeakMap<object, Map<number, string>>();

function getOverlapMap(
  allTools: RuleContext['allTools']
): Map<number, string> {
  const cached = overlapCache.get(allTools);
  if (cached) return cached;

  const profiles = allTools.map((t) => profileDescription(t.description));
  const overlapMap = new Map<number, string>();

  for (let later = 1; later < allTools.length; later++) {
    const laterProfile = profiles[later];
    if (!laterProfile) continue;

    for (let earlier = 0; earlier < later; earlier++) {
      const earlierProfile = profiles[earlier];
      if (!earlierProfile) continue;
      // Exact duplicate names are NAM-007's job, not an overlap finding.
      if (allTools[earlier].name === allTools[later].name) continue;

      if (overlaps(earlierProfile, laterProfile)) {
        overlapMap.set(later, allTools[earlier].name);
        break;
      }
    }
  }

  overlapCache.set(allTools, overlapMap);
  return overlapMap;
}

const rule: Rule = {
  id: 'BP-015',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'Tools with overlapping descriptions likely confuse agents',

  check(tool, ctx: RuleContext) {
    const issues: ValidationIssue[] = [];

    const index = ctx.allTools.indexOf(tool);
    if (index <= 0) {
      return issues;
    }

    const overlappingWith = getOverlapMap(ctx.allTools).get(index);
    if (overlappingWith === undefined) {
      return issues;
    }

    issues.push({
      id: this.id,
      category: this.category,
      severity: this.defaultSeverity,
      message: `Description overlaps heavily with tool "${overlappingWith}". Overlapping tools make it hard for agents to choose the right one`,
      tool: tool.name,
      path: 'description',
      suggestion: `Consolidate this tool with "${overlappingWith}" into a single workflow tool (e.g. schedule_event instead of list_users + list_events + create_event chains), or sharpen each description to state when to use which`,
    });

    return issues;
  },
};

export default rule;
