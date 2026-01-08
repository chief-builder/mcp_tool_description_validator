#!/usr/bin/env node
/**
 * MCP Tool Validator - CLI Entry Point
 *
 * Command-line interface for validating MCP tool definitions.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateFile, validateServer } from './core/validator.js';
import {
  formatHumanOutput,
  formatJsonOutput,
  formatSarifOutput,
} from './reporters/index.js';
import type { ValidatorConfig, IssueSeverity } from './types/index.js';

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
 */
export function parseRuleOverrides(
  ruleOverrides: Record<string, string>
): Record<string, boolean | IssueSeverity> {
  const rules: Record<string, boolean | IssueSeverity> = {};

  for (const [id, setting] of Object.entries(ruleOverrides)) {
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
    }
  }

  return rules;
}

/**
 * CLI options interface.
 */
export interface CLIOptions {
  server?: string;
  format: 'human' | 'json' | 'sarif';
  config?: string;
  rule: Record<string, string>;
  llm?: boolean;
  llmProvider?: string;
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
    process.exit(2);
  }

  // Build config from options
  const config: Partial<ValidatorConfig> = {
    output: {
      format: options.format,
      verbose: options.verbose ?? false,
      color: options.color !== false,
    },
    rules: parseRuleOverrides(options.rule || {}),
  };

  // Handle LLM options
  if (options.llm) {
    config.llm = {
      enabled: true,
      provider: options.llmProvider || 'anthropic',
      model: '',
      timeout: 30000,
    };
  }

  // Run validation
  const result = file
    ? await validateFile(file, { config, configPath: options.config })
    : await validateServer(options.server!, { config, configPath: options.config });

  // Format output
  let output: string;
  switch (options.format) {
    case 'json':
      output = formatJsonOutput(result);
      break;
    case 'sarif':
      output = formatSarifOutput(result);
      break;
    default:
      output = formatHumanOutput(result, {
        color: options.color !== false,
        verbose: options.verbose,
      });
  }

  // In quiet mode with human format, filter to only errors
  if (options.quiet && options.format === 'human') {
    const lines = output.split('\n');
    const filteredLines = lines.filter((line) => {
      // Keep header lines, error lines, and summary
      return (
        line.includes('MCP Tool Validator') ||
        line.includes('Validating:') ||
        line.includes('ERROR') ||
        line.includes('Summary:') ||
        line.includes('Errors:') ||
        line.includes('Validation failed') ||
        line.includes('Validation passed') ||
        line.match(/^[^\s]/) || // Tool names (start of line)
        line.trim() === '' ||
        line.includes('─')
      );
    });
    output = filteredLines.join('\n');
  }

  console.log(output);

  // Exit code
  if (options.ci && !result.valid) {
    process.exit(1);
  }
}

// Configure the main program
program
  .name('mcp-validate')
  .description(
    'Validate MCP tool definitions for quality, security, and LLM compatibility'
  )
  .version('0.1.0')
  .argument('[file]', 'Tool definition file to validate (JSON or YAML)')
  .option('-s, --server <url>', 'Validate tools from a live MCP server')
  .option(
    '-f, --format <format>',
    'Output format: human, json, sarif',
    'human'
  )
  .option('-c, --config <path>', 'Path to config file')
  .option(
    '-r, --rule <rule>',
    'Override rule: RULE-ID=on|off|error|warning|suggestion',
    collectRules,
    {}
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
      process.exit(2);
    }
  });

// Add serve subcommand for HTTP service
program
  .command('serve')
  .description('Start HTTP validation service')
  .option('-p, --port <port>', 'Port to listen on', '8080')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action(async (options: { port: string; host: string }) => {
    // Placeholder - actual server implementation in CHUNK-14
    console.log(`Starting validation server on ${options.host}:${options.port}...`);
    console.log(chalk.yellow('HTTP service not yet implemented'));
    console.log('This will be available in a future release.');
  });

// Export the program for testing
export { program };

// Only parse if this is the main module (not imported for testing)
// Check if we're being run directly vs imported
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('cli.js') ||
    process.argv[1].endsWith('cli.ts') ||
    process.argv[1].endsWith('mcp-validate.js') ||
    process.argv[1].includes('/bin/mcp-validate'));

if (isMainModule) {
  program.parse();
}
