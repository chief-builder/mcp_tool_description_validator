/**
 * Rule Registry
 *
 * Registry mapping rule IDs to their module paths.
 * Rules are loaded on-demand based on configuration.
 */

import type { Rule } from './types.js';

/**
 * Module result type for dynamic rule imports.
 */
export interface RuleModule {
  default: Rule;
}

/**
 * Registry mapping rule IDs to their module paths (relative to this file).
 * Rules are loaded on-demand based on configuration.
 *
 * Note: Actual rule modules will be added in subsequent chunks.
 * Currently these imports will fail at runtime until rules are implemented.
 */
export const RULE_PATHS: Record<string, string> = {
  // Schema rules (CHUNK-06)
  'SCH-001': './schema/sch-001.js',
  'SCH-002': './schema/sch-002.js',
  'SCH-003': './schema/sch-003.js',
  'SCH-004': './schema/sch-004.js',
  'SCH-005': './schema/sch-005.js',
  'SCH-006': './schema/sch-006.js',
  'SCH-007': './schema/sch-007.js',
  'SCH-008': './schema/sch-008.js',

  // Security rules (CHUNK-08)
  'SEC-001': './security/sec-001.js',
  'SEC-002': './security/sec-002.js',
  'SEC-003': './security/sec-003.js',
  'SEC-004': './security/sec-004.js',
  'SEC-005': './security/sec-005.js',
  'SEC-006': './security/sec-006.js',
  'SEC-007': './security/sec-007.js',
  'SEC-008': './security/sec-008.js',
  'SEC-009': './security/sec-009.js',
  'SEC-010': './security/sec-010.js',

  // LLM Compatibility rules (CHUNK-09)
  'LLM-001': './llm-compatibility/llm-001.js',
  'LLM-002': './llm-compatibility/llm-002.js',
  'LLM-003': './llm-compatibility/llm-003.js',
  'LLM-004': './llm-compatibility/llm-004.js',
  'LLM-005': './llm-compatibility/llm-005.js',

  // Naming rules (CHUNK-09)
  'NAM-001': './naming/nam-001.js',
  'NAM-002': './naming/nam-002.js',
  'NAM-003': './naming/nam-003.js',

  // Best practice rules (CHUNK-10)
  'BP-001': './best-practice/bp-001.js',
  'BP-002': './best-practice/bp-002.js',
  'BP-003': './best-practice/bp-003.js',
};

/**
 * Get all registered rule IDs.
 */
export function getAllRuleIds(): string[] {
  return Object.keys(RULE_PATHS);
}

/**
 * Check if a rule ID is registered.
 */
export function isRuleRegistered(ruleId: string): boolean {
  return ruleId in RULE_PATHS;
}

/**
 * Load a rule module by ID.
 * Returns null if the rule cannot be loaded (module doesn't exist yet).
 */
export async function loadRuleModule(ruleId: string): Promise<Rule | null> {
  const path = RULE_PATHS[ruleId];
  if (!path) {
    return null;
  }

  try {
    // Use dynamic import with the path
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module: RuleModule = await import(path);
    return module.default;
  } catch {
    // Rule module doesn't exist yet - skip gracefully
    return null;
  }
}
