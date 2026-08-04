/**
 * Configuration loading and management for MCP Tool Validator
 *
 * Uses cosmiconfig for flexible config file discovery and loading.
 * Supports: mcp-validate.config.yaml, mcp-validate.config.json, .mcp-validaterc, etc.
 */

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import type {
  ValidatorConfig,
  RuleConfig,
  OutputConfig,
  MCPSpecVersion,
} from '../types/index.js';

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
 * Default MCP spec version to validate against
 */
const DEFAULT_SPEC_VERSION: MCPSpecVersion = '2026-07-28';

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
  'SCH-009': true,
  'SCH-010': true,
  'SCH-011': true,

  // Naming rules (NAM-xxx)
  'NAM-002': true,
  'NAM-003': true,
  'NAM-004': true,
  'NAM-005': true,
  'NAM-006': true,
  'NAM-007': true,
  'NAM-008': true,

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
  'SEC-011': true,

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
  'LLM-013': true,

  // Best practice rules (BP-xxx)
  'BP-001': true,
  'BP-002': true,
  'BP-003': true,
  'BP-004': true,
  'BP-005': true,
  'BP-006': true,
  'BP-007': true,
  'BP-008': true,
  'BP-009': true,
  'BP-010': true,
  'BP-011': true,
  'BP-012': true,
  'BP-013': true,
  'BP-014': true,
  'BP-015': true,
};

/**
 * Complete default configuration
 */
const DEFAULT_CONFIG: ValidatorConfig = {
  rules: DEFAULT_RULES,
  output: DEFAULT_OUTPUT,
  specVersion: DEFAULT_SPEC_VERSION,
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

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Rule setting: boolean enables/disables, severity string overrides severity.
 * 'off'/'on' are accepted as aliases for false/true (common in YAML configs).
 */
const ruleSettingSchema = z
  .union([
    z.boolean(),
    z.enum(['error', 'warning', 'suggestion', 'off', 'on']),
  ])
  .transform((value) => {
    if (value === 'off') return false;
    if (value === 'on') return true;
    return value;
  });

const outputSchema = z.strictObject({
  format: z.enum(['human', 'json', 'sarif']).optional(),
  verbose: z.boolean().optional(),
  color: z.boolean().optional(),
});

const llmSchema = z.strictObject({
  enabled: z.boolean().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  timeout: z.number().int().positive().optional(),
});

// A YAML section containing only comments parses to null; treat as absent.
const nullableSection = <T extends z.ZodType>(schema: T) =>
  z
    .union([schema, z.null()])
    .optional()
    .transform((value) => (value === null ? undefined : value));

const userConfigSchema = z.strictObject({
  rules: nullableSection(z.record(z.string(), ruleSettingSchema)),
  output: nullableSection(outputSchema),
  specVersion: z.enum(['2025-11-25', '2026-07-28']).optional(),
  llm: nullableSection(llmSchema),
});

/**
 * Inline configuration overrides (e.g. from CLI flags). Unlike a full
 * ValidatorConfig, every section may be partial.
 */
export interface ConfigOverrides {
  rules?: RuleConfig;
  output?: Partial<OutputConfig>;
  specVersion?: MCPSpecVersion;
  llm?: ValidatorConfig['llm'];
}

/**
 * Validate and normalize a raw user config object.
 * Rejects unknown keys and invalid rule settings with a readable error,
 * and normalizes 'off'/'on' rule values to booleans.
 *
 * @throws Error with a human-readable message when the config is invalid
 */
export function validateUserConfig(
  raw: unknown,
  source: string
): Partial<ValidatorConfig> {
  const result = userConfigSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.') || '(root)';
        return `  - ${path}: ${issue.message}`;
      })
      .join('\n');
    throw new Error(`Invalid configuration in ${source}:\n${details}`);
  }
  return result.data as Partial<ValidatorConfig>;
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

  const result = configPath
    ? await explorer.load(configPath)
    : await explorer.search();

  if (result && !result.isEmpty) {
    const userConfig = validateUserConfig(result.config, result.filepath);
    return {
      config: mergeConfig(userConfig),
      filepath: result.filepath,
    };
  }

  // No config file found, use defaults
  return {
    config: getDefaultConfig(),
    filepath: null,
  };
}

/**
 * Resolve the effective configuration: load from an explicit path (or
 * discover via cosmiconfig search), then overlay inline overrides
 * per-section so overrides only replace the keys they actually set.
 *
 * @param configPath - Optional explicit path to a config file
 * @param overrides - Inline overrides (e.g. from CLI flags)
 */
export async function resolveConfig(
  configPath?: string,
  overrides?: ConfigOverrides
): Promise<LoadConfigResult> {
  const { config, filepath } = await loadConfig(configPath);

  if (!overrides) {
    return { config, filepath };
  }

  const resolved: ValidatorConfig = {
    rules: { ...config.rules, ...(overrides.rules ?? {}) },
    output: { ...config.output, ...(overrides.output ?? {}) },
    specVersion: overrides.specVersion ?? config.specVersion,
  };
  const llm = overrides.llm ?? config.llm;
  if (llm) {
    resolved.llm = llm;
  }

  return { config: resolved, filepath };
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
    specVersion: userConfig.specVersion ?? defaultConfig.specVersion,
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
    specVersion: DEFAULT_SPEC_VERSION,
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
