/**
 * Rule Loader
 *
 * Loads validation rules based on configuration.
 * Only loads rules that are enabled (not set to false).
 */

import type { Rule } from '../rules/types.js';
import type { RuleConfig, IssueSeverity } from '../types/index.js';
import {
  RULE_PATHS,
  isRuleRegistered,
  loadRuleModule,
} from '../rules/index.js';

/**
 * Load rules based on configuration.
 * Only loads rules that are enabled (not set to false).
 */
export async function loadRules(config: RuleConfig): Promise<Rule[]> {
  const rulesToLoad = new Set<string>();

  // Determine which rules to load from config
  for (const [ruleId, setting] of Object.entries(config)) {
    if (setting !== false && isRuleRegistered(ruleId)) {
      rulesToLoad.add(ruleId);
    }
  }

  // Also load any rules that aren't explicitly configured (use defaults)
  for (const ruleId of Object.keys(RULE_PATHS)) {
    if (!(ruleId in config)) {
      rulesToLoad.add(ruleId);
    }
  }

  // Load rules in parallel
  const loadedRules = await Promise.all(
    Array.from(rulesToLoad).map((ruleId) => loadRuleModule(ruleId))
  );

  return loadedRules.filter((rule): rule is Rule => rule !== null);
}

/**
 * Get the effective severity for a rule based on config.
 * Config can override the rule's default severity.
 */
export function getEffectiveSeverity(
  rule: Rule,
  config: RuleConfig
): IssueSeverity {
  const setting = config[rule.id];
  if (typeof setting === 'string') {
    return setting; // Config overrides severity
  }
  return rule.defaultSeverity;
}
