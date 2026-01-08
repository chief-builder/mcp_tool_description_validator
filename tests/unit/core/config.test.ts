/**
 * Configuration system tests
 *
 * Tests for loading, merging, and managing validator configuration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  mergeConfig,
  getDefaultConfig,
  getDefaultRules,
  isRuleEnabled,
  getRuleSeverity,
} from '../../../src/core/config.js';
import type { ValidatorConfig, RuleConfig } from '../../../src/types/index.js';

describe('Configuration System', () => {
  describe('getDefaultConfig', () => {
    it('should return a valid default configuration', () => {
      const config = getDefaultConfig();

      expect(config).toBeDefined();
      expect(config.rules).toBeDefined();
      expect(config.output).toBeDefined();
    });

    it('should have all default rules enabled', () => {
      const config = getDefaultConfig();

      // Check some representative rules from each category
      expect(config.rules['SCH-001']).toBe(true);
      expect(config.rules['NAM-001']).toBe(true);
      expect(config.rules['SEC-001']).toBe(true);
      expect(config.rules['LLM-001']).toBe(true);
      expect(config.rules['BP-001']).toBe(true);
    });

    it('should have expected output defaults', () => {
      const config = getDefaultConfig();

      expect(config.output.format).toBe('human');
      expect(config.output.verbose).toBe(false);
      expect(config.output.color).toBe(true);
    });

    it('should not include LLM config by default', () => {
      const config = getDefaultConfig();

      expect(config.llm).toBeUndefined();
    });

    it('should return a new object each time (no mutation)', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();

      expect(config1).not.toBe(config2);
      expect(config1.rules).not.toBe(config2.rules);
      expect(config1.output).not.toBe(config2.output);

      // Mutating one should not affect the other
      config1.rules['SEC-001'] = false;
      expect(config2.rules['SEC-001']).toBe(true);
    });
  });

  describe('getDefaultRules', () => {
    it('should return all default rules', () => {
      const rules = getDefaultRules();

      expect(rules).toBeDefined();
      expect(Object.keys(rules).length).toBeGreaterThan(0);
    });

    it('should include rules from all categories', () => {
      const rules = getDefaultRules();

      // Check for at least one rule from each category
      const hasSCH = Object.keys(rules).some((id) => id.startsWith('SCH-'));
      const hasNAM = Object.keys(rules).some((id) => id.startsWith('NAM-'));
      const hasSEC = Object.keys(rules).some((id) => id.startsWith('SEC-'));
      const hasLLM = Object.keys(rules).some((id) => id.startsWith('LLM-'));
      const hasBP = Object.keys(rules).some((id) => id.startsWith('BP-'));

      expect(hasSCH).toBe(true);
      expect(hasNAM).toBe(true);
      expect(hasSEC).toBe(true);
      expect(hasLLM).toBe(true);
      expect(hasBP).toBe(true);
    });
  });

  describe('mergeConfig', () => {
    it('should return defaults when given empty config', () => {
      const merged = mergeConfig({});
      const defaults = getDefaultConfig();

      expect(merged.output).toEqual(defaults.output);
      expect(merged.rules).toEqual(defaults.rules);
    });

    it('should allow disabling rules with false', () => {
      const merged = mergeConfig({
        rules: {
          'SEC-001': false,
          'LLM-001': false,
        },
      });

      expect(merged.rules['SEC-001']).toBe(false);
      expect(merged.rules['LLM-001']).toBe(false);
      // Other rules should still be enabled
      expect(merged.rules['SEC-002']).toBe(true);
    });

    it('should allow overriding severity with string', () => {
      const merged = mergeConfig({
        rules: {
          'LLM-005': 'error',
          'BP-001': 'warning',
          'NAM-002': 'suggestion',
        },
      });

      expect(merged.rules['LLM-005']).toBe('error');
      expect(merged.rules['BP-001']).toBe('warning');
      expect(merged.rules['NAM-002']).toBe('suggestion');
    });

    it('should merge output settings', () => {
      const merged = mergeConfig({
        output: {
          format: 'json',
          verbose: true,
          color: false,
        },
      });

      expect(merged.output.format).toBe('json');
      expect(merged.output.verbose).toBe(true);
      expect(merged.output.color).toBe(false);
    });

    it('should allow partial output overrides', () => {
      const merged = mergeConfig({
        output: {
          format: 'sarif',
          verbose: false,
          color: true,
        },
      });

      expect(merged.output.format).toBe('sarif');
      // These should retain defaults when not overridden
      expect(merged.output.verbose).toBe(false);
      expect(merged.output.color).toBe(true);
    });

    it('should include LLM config when provided', () => {
      const merged = mergeConfig({
        llm: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(merged.llm).toBeDefined();
      expect(merged.llm?.enabled).toBe(true);
      expect(merged.llm?.provider).toBe('anthropic');
      expect(merged.llm?.model).toBe('claude-3-haiku-20240307');
    });

    it('should not include LLM config when not provided', () => {
      const merged = mergeConfig({
        rules: { 'SEC-001': false },
      });

      expect(merged.llm).toBeUndefined();
    });
  });

  describe('isRuleEnabled', () => {
    it('should return true for rules set to true', () => {
      const config = getDefaultConfig();
      expect(isRuleEnabled(config, 'SEC-001')).toBe(true);
    });

    it('should return false for rules set to false', () => {
      const config = mergeConfig({ rules: { 'SEC-001': false } });
      expect(isRuleEnabled(config, 'SEC-001')).toBe(false);
    });

    it('should return true for rules with severity override', () => {
      const config = mergeConfig({ rules: { 'LLM-005': 'error' } });
      expect(isRuleEnabled(config, 'LLM-005')).toBe(true);
    });

    it('should return true for unknown rules (default enabled)', () => {
      const config = getDefaultConfig();
      expect(isRuleEnabled(config, 'UNKNOWN-999')).toBe(true);
    });
  });

  describe('getRuleSeverity', () => {
    it('should return default severity when not overridden', () => {
      const config = getDefaultConfig();
      expect(getRuleSeverity(config, 'SEC-001', 'warning')).toBe('warning');
    });

    it('should return overridden severity', () => {
      const config = mergeConfig({ rules: { 'SEC-001': 'error' } });
      expect(getRuleSeverity(config, 'SEC-001', 'warning')).toBe('error');
    });

    it('should return default for rules set to true', () => {
      const config = mergeConfig({ rules: { 'SEC-001': true } });
      expect(getRuleSeverity(config, 'SEC-001', 'suggestion')).toBe('suggestion');
    });

    it('should return default for unknown rules', () => {
      const config = getDefaultConfig();
      expect(getRuleSeverity(config, 'UNKNOWN-999', 'error')).toBe('error');
    });
  });

  describe('loadConfig', () => {
    let testDir: string;

    beforeEach(async () => {
      // Create a unique temp directory for each test
      testDir = join(tmpdir(), `mcp-validate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      // Clean up temp directory
      try {
        await rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should return defaults when no config file exists', async () => {
      // Search from a directory with no config file
      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        const result = await loadConfig();

        expect(result.filepath).toBeNull();
        expect(result.config).toEqual(getDefaultConfig());
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should load config from specified YAML path', async () => {
      const configPath = join(testDir, 'custom-config.yaml');
      await writeFile(
        configPath,
        `
rules:
  SEC-001: false
  LLM-005: error
output:
  format: json
  verbose: true
  color: false
`
      );

      const result = await loadConfig(configPath);

      expect(result.filepath).toBe(configPath);
      expect(result.config.rules['SEC-001']).toBe(false);
      expect(result.config.rules['LLM-005']).toBe('error');
      expect(result.config.output.format).toBe('json');
      expect(result.config.output.verbose).toBe(true);
      // Other rules should still have defaults
      expect(result.config.rules['SEC-002']).toBe(true);
    });

    it('should load config from specified JSON path', async () => {
      const configPath = join(testDir, 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          rules: {
            'BP-001': false,
            'NAM-001': 'suggestion',
          },
          output: {
            format: 'sarif',
            verbose: false,
            color: true,
          },
        })
      );

      const result = await loadConfig(configPath);

      expect(result.filepath).toBe(configPath);
      expect(result.config.rules['BP-001']).toBe(false);
      expect(result.config.rules['NAM-001']).toBe('suggestion');
      expect(result.config.output.format).toBe('sarif');
    });

    it('should discover mcp-validate.config.yaml in working directory', async () => {
      const configPath = join(testDir, 'mcp-validate.config.yaml');
      await writeFile(
        configPath,
        `
rules:
  SCH-001: false
output:
  format: json
  verbose: false
  color: true
`
      );

      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        const result = await loadConfig();

        // Use realpath to resolve symlinks (e.g., /tmp -> /private/tmp on macOS)
        const expectedPath = await realpath(configPath);
        expect(result.filepath).toBe(expectedPath);
        expect(result.config.rules['SCH-001']).toBe(false);
        expect(result.config.output.format).toBe('json');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should discover .mcp-validaterc in working directory', async () => {
      const configPath = join(testDir, '.mcp-validaterc');
      await writeFile(
        configPath,
        `
rules:
  SEC-005: warning
output:
  format: human
  verbose: true
  color: true
`
      );

      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        const result = await loadConfig();

        // Use realpath to resolve symlinks (e.g., /tmp -> /private/tmp on macOS)
        const expectedPath = await realpath(configPath);
        expect(result.filepath).toBe(expectedPath);
        expect(result.config.rules['SEC-005']).toBe('warning');
        expect(result.config.output.verbose).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should merge loaded config with defaults', async () => {
      const configPath = join(testDir, 'partial.yaml');
      await writeFile(
        configPath,
        `
rules:
  SEC-001: false
`
      );

      const result = await loadConfig(configPath);

      // Specified rule should be overridden
      expect(result.config.rules['SEC-001']).toBe(false);
      // Other rules should have defaults
      expect(result.config.rules['SEC-002']).toBe(true);
      expect(result.config.rules['LLM-001']).toBe(true);
      // Output should have defaults
      expect(result.config.output.format).toBe('human');
      expect(result.config.output.verbose).toBe(false);
      expect(result.config.output.color).toBe(true);
    });

    it('should throw error for invalid explicit config path', async () => {
      const invalidPath = join(testDir, 'nonexistent.yaml');

      await expect(loadConfig(invalidPath)).rejects.toThrow();
    });

    it('should handle LLM configuration', async () => {
      const configPath = join(testDir, 'llm-config.yaml');
      await writeFile(
        configPath,
        `
rules: {}
output:
  format: human
  verbose: false
  color: true
llm:
  enabled: true
  provider: anthropic
  model: claude-3-haiku-20240307
  timeout: 60000
`
      );

      const result = await loadConfig(configPath);

      expect(result.config.llm).toBeDefined();
      expect(result.config.llm?.enabled).toBe(true);
      expect(result.config.llm?.provider).toBe('anthropic');
      expect(result.config.llm?.model).toBe('claude-3-haiku-20240307');
      expect(result.config.llm?.timeout).toBe(60000);
    });
  });
});
