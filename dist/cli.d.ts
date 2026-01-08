#!/usr/bin/env node
import { Command } from 'commander';
import { I as IssueSeverity } from './index-DI4S4xR8.js';

/**
 * MCP Tool Validator - CLI Entry Point
 *
 * Command-line interface for validating MCP tool definitions.
 */

declare const program: Command;
/**
 * Collect multiple --rule options into a record.
 */
declare function collectRules(value: string, previous: Record<string, string>): Record<string, string>;
/**
 * Parse rule settings from CLI into config format.
 */
declare function parseRuleOverrides(ruleOverrides: Record<string, string>): Record<string, boolean | IssueSeverity>;
/**
 * CLI options interface.
 */
interface CLIOptions {
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

export { type CLIOptions, collectRules, parseRuleOverrides, program };
