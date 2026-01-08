/**
 * Configuration loading and management for MCP Tool Validator
 *
 * Uses cosmiconfig for flexible config file discovery and loading.
 * Supports: mcp-validate.config.yaml, mcp-validate.config.json, .mcp-validaterc, etc.
 */

import { cosmiconfig } from 'cosmiconfig';
import type { ValidatorConfig, RuleConfig, OutputConfig } from '../types/index.js';

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default output configuration
 */
const DEFAULT_OUTPUT: OutputConfig = {
  format: 'human',
  verbose: false,
  color: true,
};

/**
 * Default rule configurations (all rules enabled with default severities)
 */
const DEFAULT_RULES: RuleConfig = {
  // Schema rules (SCH-xxx)
  'SCH-001': true,
  'SCH-002': true,
  'SCH-003': true,
  'SCH-004': true,
  'SCH-005': true,
  'SCH-006': true,
  'SCH-007': true,
  'SCH-008': true,

  // Naming rules (NAM-xxx)
  'NAM-001': true,
  'NAM-002': true,
  'NAM-003': true,
  'NAM-004': true,
  'NAM-005': true,
  'NAM-006': true,

  // Security rules (SEC-xxx)
  'SEC-001': true,
  'SEC-002': true,
  'SEC-003': true,
  'SEC-004': true,
  'SEC-005': true,
  'SEC-006': true,
  'SEC-007': true,
  'SEC-008': true,
  'SEC-009': true,
  'SEC-010': true,

  // LLM compatibility rules (LLM-xxx)
  'LLM-001': true,
  'LLM-002': true,
  'LLM-003': true,
  'LLM-004': true,
  'LLM-005': true,
  'LLM-006': true,
  'LLM-007': true,
  'LLM-008': true,
  'LLM-009': true,
  'LLM-010': true,
  'LLM-011': true,
  'LLM-012': true,

  // Best practice rules (BP-xxx)
  'BP-001': true,
  'BP-002': true,
  'BP-003': true,
  'BP-004': true,
  'BP-005': true,
  'BP-006': true,
  'BP-007': true,
  'BP-008': true,
};

/**
 * Complete default configuration
 */
const DEFAULT_CONFIG: ValidatorConfig = {
  rules: DEFAULT_RULES,
  output: DEFAULT_OUTPUT,
};

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Module name for cosmiconfig search
 */
const MODULE_NAME = 'mcp-validate';

/**
 * Create a cosmiconfig explorer for configuration discovery
 */
function createExplorer() {
  return cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      // YAML variants (preferred)
      `${MODULE_NAME}.config.yaml`,
      `${MODULE_NAME}.config.yml`,
      // JSON variants
      `${MODULE_NAME}.config.json`,
      // RC file variants
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.yaml`,
      `.${MODULE_NAME}rc.yml`,
      `.${MODULE_NAME}rc.json`,
      // Package.json
      'package.json',
    ],
    packageProp: MODULE_NAME,
  });
}

/**
 * Result from loading configuration
 */
export interface LoadConfigResult {
  /** The merged configuration */
  config: ValidatorConfig;
  /** Path to the config file that was loaded, or null if using defaults */
  filepath: string | null;
}

/**
 * Load configuration from various sources using cosmiconfig.
 *
 * Searches for configuration in the following order:
 * 1. Explicit config path (if provided)
 * 2. mcp-validate.config.yaml / mcp-validate.config.yml
 * 3. mcp-validate.config.json
 * 4. .mcp-validaterc (YAML or JSON)
 * 5. .mcp-validaterc.yaml / .mcp-validaterc.yml
 * 6. .mcp-validaterc.json
 * 7. "mcp-validate" key in package.json
 *
 * @param configPath - Optional explicit path to config file
 * @returns The loaded configuration merged with defaults, and the filepath
 */
export async function loadConfig(configPath?: string): Promise<LoadConfigResult> {
  const explorer = createExplorer();

  try {
    let result;

    if (configPath) {
      // Load from explicit path
      result = await explorer.load(configPath);
    } else {
      // Search for config file
      result = await explorer.search();
    }

    if (result && !result.isEmpty) {
      // Merge user config with defaults
      const mergedConfig = mergeConfig(result.config as Partial<ValidatorConfig>);
      return {
        config: mergedConfig,
        filepath: result.filepath,
      };
    }

    // No config file found, use defaults
    return {
      config: getDefaultConfig(),
      filepath: null,
    };
  } catch (error) {
    // If config file exists but is invalid, throw the error
    if (configPath) {
      throw error;
    }

    // For search failures, fall back to defaults
    return {
      config: getDefaultConfig(),
      filepath: null,
    };
  }
}

// ============================================================================
// Configuration Merging
// ============================================================================

/**
 * Deep merge user configuration with defaults.
 *
 * Merging rules:
 * - User rules override default rules (false disables, severity overrides)
 * - User output settings override defaults
 * - LLM config is only present if user provides it
 *
 * @param userConfig - Partial user configuration
 * @returns Complete merged configuration
 */
export function mergeConfig(userConfig: Partial<ValidatorConfig>): ValidatorConfig {
  const defaultConfig = getDefaultConfig();

  // Merge rules: start with defaults, overlay user rules
  const mergedRules: RuleConfig = {
    ...defaultConfig.rules,
    ...(userConfig.rules ?? {}),
  };

  // Merge output: start with defaults, overlay user settings
  const mergedOutput: OutputConfig = {
    ...defaultConfig.output,
    ...(userConfig.output ?? {}),
  };

  // Build the merged config
  const mergedConfig: ValidatorConfig = {
    rules: mergedRules,
    output: mergedOutput,
  };

  // Only include LLM config if user provides it
  if (userConfig.llm) {
    mergedConfig.llm = userConfig.llm;
  }

  return mergedConfig;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a fresh copy of the default configuration.
 *
 * @returns Default ValidatorConfig with all rules enabled
 */
export function getDefaultConfig(): ValidatorConfig {
  return {
    rules: { ...DEFAULT_RULES },
    output: { ...DEFAULT_OUTPUT },
  };
}

/**
 * Get the default rules configuration.
 *
 * @returns Default RuleConfig with all rules enabled
 */
export function getDefaultRules(): RuleConfig {
  return { ...DEFAULT_RULES };
}

/**
 * Check if a rule is enabled in the given configuration.
 *
 * @param config - Validator configuration
 * @param ruleId - Rule identifier (e.g., "SEC-001")
 * @returns true if the rule is enabled, false otherwise
 */
export function isRuleEnabled(config: ValidatorConfig, ruleId: string): boolean {
  const ruleSetting = config.rules[ruleId];

  // Rule not in config means use default (enabled)
  if (ruleSetting === undefined) {
    return true;
  }

  // Explicit false means disabled
  if (ruleSetting === false) {
    return false;
  }

  // true or severity string means enabled
  return true;
}

/**
 * Get the severity for a rule, respecting overrides.
 *
 * @param config - Validator configuration
 * @param ruleId - Rule identifier
 * @param defaultSeverity - Default severity if not overridden
 * @returns The effective severity for the rule
 */
export function getRuleSeverity(
  config: ValidatorConfig,
  ruleId: string,
  defaultSeverity: 'error' | 'warning' | 'suggestion'
): 'error' | 'warning' | 'suggestion' {
  const ruleSetting = config.rules[ruleId];

  // If severity is explicitly set, use it
  if (
    ruleSetting === 'error' ||
    ruleSetting === 'warning' ||
    ruleSetting === 'suggestion'
  ) {
    return ruleSetting;
  }

  // Otherwise use default
  return defaultSeverity;
}
