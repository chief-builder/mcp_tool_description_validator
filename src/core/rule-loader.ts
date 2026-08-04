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
 * Default MCP spec version rules are loaded for when none is given.
 */
const DEFAULT_SPEC_VERSION = '2026-07-28';

/**
 * Load rules based on configuration.
 * Only loads rules that are enabled (not set to false) and that apply to
 * the given MCP spec version (rules without specVersions apply to all).
 */
export async function loadRules(
  config: RuleConfig,
  specVersion: string = DEFAULT_SPEC_VERSION
): Promise<Rule[]> {
  const rules: Rule[] = [];

  for (const [ruleId, rule] of Object.entries(RULES)) {
    // Skip rules explicitly disabled in config
    if (config[ruleId] === false) {
      continue;
    }
    // Skip rules that don't apply to the targeted spec version
    if (rule.specVersions && !rule.specVersions.includes(specVersion)) {
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
