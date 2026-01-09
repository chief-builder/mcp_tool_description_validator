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
 */
export const RULES: Record<string, Rule> = Object.fromEntries(
  ALL_RULES.map((rule) => [rule.id, rule])
);

/**
 * Get all registered rule IDs.
 */
export function getAllRuleIds(): string[] {
  return Object.keys(RULES);
}

/**
 * Check if a rule ID is registered.
 */
export function isRuleRegistered(ruleId: string): boolean {
  return ruleId in RULES;
}

/**
 * Get a rule by ID.
 */
export function getRuleById(ruleId: string): Rule | undefined {
  return RULES[ruleId];
}

/**
 * Load a rule by ID (synchronous via static registry).
 * Kept async for backwards compatibility with existing code.
 */
export async function loadRuleModule(ruleId: string): Promise<Rule | null> {
  return RULES[ruleId] ?? null;
}

// Re-export types
export type { Rule } from './types.js';
