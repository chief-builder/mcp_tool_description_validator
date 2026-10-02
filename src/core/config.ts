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
  ValidationProfile,
} from '../types/index.js';
import { DEFAULT_MCP_SPEC_VERSION, MCP_SPEC_VERSIONS } from './spec-versions.js';
import { resolveLLMConfig } from '../llm/defaults.js';
import { RULES } from '../rules/index.js';

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
const DEFAULT_SPEC_VERSION: MCPSpecVersion = DEFAULT_MCP_SPEC_VERSION;
const DEFAULT_PROFILE: ValidationProfile = 'governance';

/**
 * Default rule configurations: every registered rule enabled with its
 * default severity. Derived from the registry so it cannot drift.
 */
const DEFAULT_RULES: RuleConfig = Object.fromEntries(
  Object.keys(RULES).map((ruleId) => [ruleId, true])
);

/**
 * Complete default configuration
 */
const DEFAULT_CONFIG: ValidatorConfig = {
  rules: DEFAULT_RULES,
  output: DEFAULT_OUTPUT,
  specVersion: DEFAULT_SPEC_VERSION,
  profile: DEFAULT_PROFILE,
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

// Unknown rule IDs (typos, retired rules) would otherwise be silently
// ignored, leaving the user believing a rule is configured.
const rulesSchema = z
  .record(z.string(), ruleSettingSchema)
  .superRefine((rules, ctx) => {
    for (const id of Object.keys(rules)) {
      if (!Object.hasOwn(RULES, id)) {
        ctx.addIssue({
          code: 'custom',
          path: [id],
          message: `Unknown rule ID "${id}"`,
        });
      }
    }
  });

const userConfigSchema = z.strictObject({
  rules: nullableSection(rulesSchema),
  output: nullableSection(outputSchema),
  specVersion: z.enum(MCP_SPEC_VERSIONS).optional(),
  discoverySpecVersion: z.enum(MCP_SPEC_VERSIONS).optional(),
  profile: z.enum(['compliance', 'governance']).optional(),
  llm: nullableSection(llmSchema),
});

// Remote callers of the HTTP service may tune rules and reporting, but not
// the LLM section: it selects a provider endpoint and credentials, which
// would let any client send the server's API key to a host of its choice.
const requestConfigSchema = userConfigSchema.omit({ llm: true });

/**
 * Inline configuration overrides (e.g. from CLI flags). Unlike a full
 * ValidatorConfig, every section may be partial.
 */
export interface ConfigOverrides {
  rules?: RuleConfig;
  output?: Partial<OutputConfig>;
  specVersion?: MCPSpecVersion;
  discoverySpecVersion?: MCPSpecVersion;
  profile?: ValidationProfile;
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
    throw new Error(formatConfigIssues(source, result.error.issues));
  }
  return result.data as Partial<ValidatorConfig>;
}

/**
 * Validate and normalize configuration supplied by an untrusted remote
 * caller (the HTTP service). Same rules as validateUserConfig, except the
 * `llm` section is rejected.
 *
 * @throws Error with a human-readable message when the config is invalid
 */
export function validateRequestConfig(raw: unknown): ConfigOverrides {
  const result = requestConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(formatConfigIssues('HTTP request', result.error.issues));
  }
  return result.data as ConfigOverrides;
}

function formatConfigIssues(
  source: string,
  issues: readonly { path: PropertyKey[]; message: string }[]
): string {
  const details = issues
    .map((issue) => {
      const path = issue.path.map(String).join('.') || '(root)';
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
  return `Invalid configuration in ${source}:\n${details}`;
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
 * @param options.discover - Search the working directory for a config file
 *   when no explicit path is given (default true). Pass false to start from
 *   the built-in defaults without touching the filesystem.
 */
export async function resolveConfig(
  configPath?: string,
  overrides?: ConfigOverrides,
  options: { discover?: boolean } = {}
): Promise<LoadConfigResult> {
  const { config, filepath } =
    configPath !== undefined || options.discover !== false
      ? await loadConfig(configPath)
      : { config: getDefaultConfig(), filepath: null };

  if (!overrides) {
    return { config, filepath };
  }

  const resolved: ValidatorConfig = {
    rules: { ...config.rules, ...(overrides.rules ?? {}) },
    output: { ...config.output, ...(overrides.output ?? {}) },
    specVersion: overrides.specVersion ?? config.specVersion,
    discoverySpecVersion:
      overrides.discoverySpecVersion ?? config.discoverySpecVersion,
    profile: overrides.profile ?? config.profile,
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
    discoverySpecVersion: userConfig.discoverySpecVersion,
    profile: userConfig.profile ?? defaultConfig.profile,
  };

  // Only include LLM config if user provides it; fill omitted fields
  // (provider, model, timeout) with defaults.
  if (userConfig.llm) {
    mergedConfig.llm = resolveLLMConfig(userConfig.llm);
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
    profile: DEFAULT_PROFILE,
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
