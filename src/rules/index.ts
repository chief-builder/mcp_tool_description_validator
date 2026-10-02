/**
 * Rule Registry
 *
 * Static registry of all validation rules.
 * Rules are loaded at module initialization time, not dynamically.
 */

import type { Rule } from './types.js';
import { schemaRules } from './schema/index.js';
import { namingRules } from './naming/index.js';
import { securityRules } from './security/index.js';
import { llmRules } from './llm-compatibility/index.js';
import { bestPracticeRules } from './best-practice/index.js';

/**
 * All rules combined into a flat array.
 */
const ALL_RULES: Rule[] = [
  ...schemaRules,
  ...namingRules,
  ...securityRules,
  ...llmRules,
  ...bestPracticeRules,
];

/**
 * Registry mapping rule IDs to their Rule objects.
 * Duplicate IDs would silently shadow an earlier rule via
 * Object.fromEntries, so fail fast at module init instead.
 */
const seenIds = new Set<string>();
for (const rule of ALL_RULES) {
  if (seenIds.has(rule.id)) {
    throw new Error(`Duplicate rule ID registered: ${rule.id}`);
  }
  seenIds.add(rule.id);
}

export const RULES: Record<string, Rule> = Object.fromEntries(
  ALL_RULES.map((rule) => [rule.id, rule])
);

// Re-export types
export type { Rule } from './types.js';
