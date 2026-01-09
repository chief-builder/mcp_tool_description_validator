/**
 * Rule Loader
 *
 * Loads validation rules based on configuration.
 * Only loads rules that are enabled (not set to false).
 */

import type { Rule } from '../rules/types.js';
import type { RuleConfig, IssueSeverity } from '../types/index.js';
import { RULES } from '../rules/index.js';

/**
 * Load rules based on configuration.
 * Only loads rules that are enabled (not set to false).
 */
export async function loadRules(config: RuleConfig): Promise<Rule[]> {
  const rules: Rule[] = [];

  for (const [ruleId, rule] of Object.entries(RULES)) {
    // Skip rules explicitly disabled in config
    if (config[ruleId] === false) {
      continue;
    }
    rules.push(rule);
  }

  return rules;
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
