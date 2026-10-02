#!/usr/bin/env node
/**
 * MCP Tool Validator - CLI Entry Point
 *
 * Command-line interface for validating MCP tool definitions.
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command, InvalidArgumentError, Option } from 'commander';
import chalk from 'chalk';
import { validateFile, validateServer } from './core/validator.js';
import { resolveConfig, type ConfigOverrides } from './core/config.js';
import { VERSION } from './version.js';
import { MCP_SPEC_VERSIONS } from './core/spec-versions.js';
import { RULES } from './rules/index.js';
import { resolveLLMConfig } from './llm/defaults.js';
import { DEFAULT_HOST, DEFAULT_PORT, startServer } from './service/server.js';
import {
  formatHumanOutput,
  formatJsonOutput,
  formatSarifOutput,
} from './reporters/index.js';
import type {
  LLMConfig,
  ValidatorConfig,
  OutputConfig,
  IssueSeverity,
  MCPSpecVersion,
  ValidationProfile,
} from './types/index.js';

const program = new Command();

/**
 * Collect multiple --rule options into a record.
 */
export function collectRules(
  value: string,
  previous: Record<string, string>
): Record<string, string> {
  const eqIndex = value.indexOf('=');
  if (eqIndex === -1) {
    // Invalid format, just store as-is with empty value
    previous[value] = '';
    return previous;
  }
  const id = value.slice(0, eqIndex);
  const setting = value.slice(eqIndex + 1);
  if (id && setting) {
    previous[id] = setting;
  }
  return previous;
}

/**
 * Parse rule settings from CLI into config format.
 *
 * @throws Error for an unknown rule ID or an unrecognized setting
 */
export function parseRuleOverrides(
  ruleOverrides: Record<string, string>
): Record<string, boolean | IssueSeverity> {
  const rules: Record<string, boolean | IssueSeverity> = {};

  for (const [id, setting] of Object.entries(ruleOverrides)) {
    if (!Object.hasOwn(RULES, id)) {
      throw new Error(`--rule: unknown rule ID "${id}"`);
    }
    const normalizedSetting = setting.toLowerCase();
    if (normalizedSetting === 'off' || normalizedSetting === 'false') {
      rules[id] = false;
    } else if (normalizedSetting === 'on' || normalizedSetting === 'true') {
      rules[id] = true;
    } else if (
      normalizedSetting === 'error' ||
      normalizedSetting === 'warning' ||
      normalizedSetting === 'suggestion'
    ) {
      rules[id] = normalizedSetting as IssueSeverity;
    } else {
      throw new Error(
        `--rule ${id}: invalid setting "${setting}" (use on, off, error, warning, or suggestion)`
      );
    }
  }

  return rules;
}

/**
 * Apply --llm / --llm-provider on top of the configured LLM settings.
 * A provider chosen on the command line also replaces the configured
 * model, unless the config names a model for that same provider.
 */
export function enableLLM(
  configured: LLMConfig | undefined,
  provider: string | undefined
): LLMConfig {
  const switchingProvider =
    provider !== undefined && provider !== configured?.provider;
  return resolveLLMConfig({
    ...configured,
    enabled: true,
    ...(provider ? { provider } : {}),
    ...(switchingProvider ? { model: '' } : {}),
  });
}

/**
 * Parse --timeout as a positive integer number of milliseconds.
 */
export function parseTimeout(value: string): number {
  const ms = Number(value);
  if (!Number.isInteger(ms) || ms <= 0) {
    throw new InvalidArgumentError(
      'Must be a positive integer (milliseconds).'
    );
  }
  return ms;
}

/**
 * CLI options interface.
 */
export interface CLIOptions {
  server?: string;
  format: 'human' | 'json' | 'sarif';
  config?: string;
  specVersion?: MCPSpecVersion;
  discoverySpecVersion?: MCPSpecVersion;
  profile?: ValidationProfile;
  rule: Record<string, string>;
  llm?: boolean;
  llmProvider?: string;
  timeout?: number;
  verbose?: boolean;
  quiet?: boolean;
  ci?: boolean;
  color: boolean;
}

/**
 * Run the validation based on CLI arguments.
 */
async function runValidation(
  file: string | undefined,
  options: CLIOptions
): Promise<void> {
  // Must have either file or --server
  if (!file && !options.server) {
    console.error(
      chalk.red('Error:'),
      'Must provide a file path or --server option'
    );
    process.exitCode = 2;
    return;
  }

  // Build overrides from options the user actually set, so config-file
  // settings survive when the corresponding flag was not passed.
  const explicitOutput: Partial<OutputConfig> = {};
  if (program.getOptionValueSource('format') === 'cli') {
    explicitOutput.format = options.format;
  }
  if (options.verbose !== undefined) {
    explicitOutput.verbose = options.verbose;
  }
  if (program.getOptionValueSource('color') === 'cli') {
    explicitOutput.color = options.color !== false;
  }

  const overrides: ConfigOverrides = {
    output: explicitOutput,
    rules: parseRuleOverrides(options.rule || {}),
  };
  // Only override the spec version when the flag was passed explicitly,
  // so a config-file specVersion survives (default comes from config)
  if (program.getOptionValueSource('specVersion') === 'cli') {
    overrides.specVersion = options.specVersion;
  }
  if (program.getOptionValueSource('discoverySpecVersion') === 'cli') {
    overrides.discoverySpecVersion = options.discoverySpecVersion;
  }
  if (program.getOptionValueSource('profile') === 'cli') {
    overrides.profile = options.profile;
  }

  // Resolve effective config (explicit path or discovery + overrides)
  const { config } = await resolveConfig(options.config, overrides);

  // Handle LLM options: --llm enables analysis on top of any file config
  if (options.llm) {
    config.llm = enableLLM(config.llm, options.llmProvider);
  }

  // Run validation with the fully-resolved config
  const result = file
    ? await validateFile(file, { config, configPath: options.config })
    : await validateServer(options.server!, {
        config,
        configPath: options.config,
        timeout: options.timeout,
      });

  // Format output
  const effectiveFormat = config.output.format;
  let output: string;
  switch (effectiveFormat) {
    case 'json':
      output = formatJsonOutput(result);
      break;
    case 'sarif':
      output = formatSarifOutput(result);
      break;
    default:
      output = formatHumanOutput(result, {
        color: config.output.color,
        verbose: config.output.verbose,
        quiet: options.quiet,
      });
  }

  console.log(output);

  // Exit code. Set rather than call process.exit() so piped output
  // (large JSON/SARIF reports) is fully flushed before the process ends.
  if (options.ci && !result.valid) {
    process.exitCode = 1;
  }
}

// Configure the main program
program
  .name('mcp-validate')
  .description(
    'Validate MCP tool definitions for quality, security, and LLM compatibility'
  )
  .version(VERSION)
  // Options after `serve` belong to serve (e.g. `serve -c file`).
  .enablePositionalOptions()
  .argument('[file]', 'Tool definition file to validate (JSON or YAML)')
  .option('-s, --server <url>', 'Validate tools from a live MCP server')
  .option('-f, --format <format>', 'Output format: human, json, sarif', 'human')
  .option('-c, --config <path>', 'Path to config file')
  .addOption(
    new Option(
      '--spec-version <version>',
      'MCP spec version to validate against'
    ).choices(MCP_SPEC_VERSIONS)
  )
  .addOption(
    new Option(
      '--discovery-spec-version <version>',
      'MCP revision used to discover tools from a live server'
    ).choices(MCP_SPEC_VERSIONS)
  )
  .addOption(
    new Option('--profile <profile>', 'Validation policy profile').choices([
      'compliance',
      'governance',
    ])
  )
  .option(
    '-r, --rule <rule>',
    'Override rule: RULE-ID=on|off|error|warning|suggestion',
    collectRules,
    {}
  )
  .option(
    '--timeout <ms>',
    'Live discovery timeout per operation, in milliseconds (default: 30000)',
    parseTimeout
  )
  .option('--llm', 'Enable LLM-assisted analysis')
  .option(
    '--llm-provider <provider>',
    'LLM provider: openai, anthropic, ollama'
  )
  .option('-v, --verbose', 'Verbose output')
  .option('-q, --quiet', 'Only show errors')
  .option('--ci', 'CI mode: exit 1 on any error')
  .option('--no-color', 'Disable colored output')
  .action(async (file: string | undefined, options: CLIOptions) => {
    try {
      await runValidation(file, options);
    } catch (error) {
      console.error(
        chalk.red('Error:'),
        error instanceof Error ? error.message : error
      );
      process.exitCode = 2;
    }
  });

// Add serve subcommand for HTTP service
program
  .command('serve')
  .description('Start HTTP validation service')
  .option('-p, --port <port>', 'Port to listen on', String(DEFAULT_PORT))
  .option('-h, --host <host>', 'Host to bind to', DEFAULT_HOST)
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options: { port: string; host: string; config?: string }) => {
    const port = Number.parseInt(options.port, 10);
    if (Number.isNaN(port) || port < 0 || port > 65535) {
      console.error(chalk.red('Error:'), `Invalid port: ${options.port}`);
      process.exitCode = 2;
      return;
    }
    // Resolve and validate the server's config once, at startup, so a bad
    // config fails fast instead of on every request.
    let config: ValidatorConfig;
    try {
      ({ config } = await resolveConfig(options.config));
    } catch (error) {
      console.error(
        chalk.red('Error:'),
        error instanceof Error ? error.message : error
      );
      process.exitCode = 2;
      return;
    }
    const server = startServer({ port, host: options.host, config });
    server.on('error', (error: Error) => {
      console.error(
        chalk.red('Error:'),
        `Cannot start server: ${error.message}`
      );
      process.exitCode = 2;
    });
  });

// Export the program for testing
export { program };

/**
 * Run the CLI with the given arguments. The `mcp-validate` bin calls this
 * directly, so the CLI works however it is launched (npm/npx shims,
 * symlinks, Windows paths).
 */
export async function run(argv: string[] = process.argv): Promise<void> {
  await program.parseAsync(argv);
}

// Also run when this file is executed directly (`node dist/cli.js`), but
// not when it is imported (by bin/mcp-validate.js or by tests).
function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  await run();
}
