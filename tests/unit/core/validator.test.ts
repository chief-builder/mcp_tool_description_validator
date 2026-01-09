/**
 * Core Validator Tests
 *
 * Tests for the main validation API: validate(), validateFile(), validateServer()
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validate,
  validateFile,
  validateServer,
} from '../../../src/core/validator.js';
import type { ToolDefinition } from '../../../src/types/index.js';

/**
 * Create a valid tool definition for testing.
 */
function createValidTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool that performs validation testing operations.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to execute',
          maxLength: 1000,
        },
      },
      required: ['query'],
    },
    source: { type: 'file', location: 'test.json', raw: {} },
    ...overrides,
  };
}

/**
 * Create a tool with issues for testing.
 */
function createInvalidTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'x', // Too short - NAM-002
    description: 'bad', // Too short - LLM-001
    inputSchema: {
      type: 'object',
      properties: {},
    },
    source: { type: 'file', location: 'test.json', raw: {} },
    ...overrides,
  };
}

describe('Core Validator', () => {
  describe('validate()', () => {
    it('should return valid: true for well-formed tool definitions', async () => {
      const tools = [createValidTool()];

      const result = await validate(tools);

      expect(result.valid).toBe(true);
      expect(result.summary.totalTools).toBe(1);
      expect(result.summary.validTools).toBe(1);
      expect(result.summary.issuesBySeverity.error).toBe(0);
    });

    it('should return issues for invalid tool definitions', async () => {
      const tools = [createInvalidTool()];

      const result = await validate(tools);

      // Should have some issues (may or may not be errors depending on rule severities)
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.summary.totalTools).toBe(1);
    });

    it('should validate multiple tools', async () => {
      const tools = [
        createValidTool({ name: 'tool-one' }),
        createValidTool({ name: 'tool-two' }),
        createValidTool({ name: 'tool-three' }),
      ];

      const result = await validate(tools);

      expect(result.summary.totalTools).toBe(3);
      expect(result.tools).toHaveLength(3);
    });

    it('should return empty result for empty tool array', async () => {
      const result = await validate([]);

      expect(result.valid).toBe(true);
      expect(result.summary.totalTools).toBe(0);
      expect(result.issues).toHaveLength(0);
      expect(result.tools).toHaveLength(0);
    });

    it('should respect config to disable rules', async () => {
      const tools = [createInvalidTool()];

      // Disable all rules
      const disabledRules: Record<string, boolean> = {};
      const ruleIds = [
        'SCH-001', 'SCH-002', 'SCH-003', 'SCH-004', 'SCH-005', 'SCH-006', 'SCH-007', 'SCH-008',
        'NAM-001', 'NAM-002', 'NAM-003', 'NAM-004', 'NAM-005', 'NAM-006',
        'SEC-001', 'SEC-002', 'SEC-003', 'SEC-004', 'SEC-005', 'SEC-006', 'SEC-007', 'SEC-008', 'SEC-009', 'SEC-010',
        'LLM-001', 'LLM-002', 'LLM-003', 'LLM-004', 'LLM-005', 'LLM-006', 'LLM-007', 'LLM-008', 'LLM-009', 'LLM-010', 'LLM-011', 'LLM-012',
        'BP-001', 'BP-002', 'BP-003', 'BP-004', 'BP-005', 'BP-006', 'BP-007', 'BP-008', 'BP-009',
      ];
      for (const id of ruleIds) {
        disabledRules[id] = false;
      }

      const result = await validate(tools, {
        config: { rules: disabledRules },
      });

      expect(result.issues).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it('should include correct metadata', async () => {
      const tools = [createValidTool()];

      const result = await validate(tools);

      expect(result.metadata.validatorVersion).toBe('0.1.0');
      expect(result.metadata.mcpSpecVersion).toBe('2025-11-25');
      expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.llmAnalysisUsed).toBe(false);
    });

    it('should include per-tool results', async () => {
      const tools = [
        createValidTool({ name: 'valid-tool' }),
        createInvalidTool({ name: 'x' }),
      ];

      const result = await validate(tools);

      expect(result.tools).toHaveLength(2);

      const validToolResult = result.tools.find((t) => t.name === 'valid-tool');
      expect(validToolResult).toBeDefined();
      expect(validToolResult?.valid).toBe(true);

      const invalidToolResult = result.tools.find((t) => t.name === 'x');
      expect(invalidToolResult).toBeDefined();
      // The 'x' tool might have warnings/suggestions but maybe not errors
      expect(invalidToolResult?.issues.length).toBeGreaterThan(0);
    });

    it('should aggregate issues by category and severity', async () => {
      const tools = [createInvalidTool()];

      const result = await validate(tools);

      expect(result.summary.issuesByCategory).toBeDefined();
      expect(result.summary.issuesBySeverity).toBeDefined();
      expect('error' in result.summary.issuesBySeverity).toBe(true);
      expect('warning' in result.summary.issuesBySeverity).toBe(true);
      expect('suggestion' in result.summary.issuesBySeverity).toBe(true);
    });
  });

  describe('validateFile()', () => {
    let testDir: string;

    beforeEach(async () => {
      const baseTmpDir = await realpath(tmpdir());
      testDir = join(baseTmpDir, `mcp-validator-test-${Date.now()}`);
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it('should load and validate JSON file', async () => {
      const toolJson = {
        name: 'file-test-tool',
        description: 'A tool loaded from a JSON file for testing purposes.',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input parameter' },
          },
          required: ['input'],
        },
      };

      const filePath = join(testDir, 'tool.json');
      await writeFile(filePath, JSON.stringify(toolJson, null, 2));

      const result = await validateFile(filePath);

      expect(result.summary.totalTools).toBe(1);
      expect(result.tools[0].name).toBe('file-test-tool');
      expect(result.metadata.configUsed).toBe('');
    });

    it('should load and validate YAML file', async () => {
      const toolYaml = `
name: yaml-test-tool
description: A tool loaded from a YAML file for testing purposes.
inputSchema:
  type: object
  properties:
    data:
      type: string
      description: Data to process
  required:
    - data
`;

      const filePath = join(testDir, 'tool.yaml');
      await writeFile(filePath, toolYaml);

      const result = await validateFile(filePath);

      expect(result.summary.totalTools).toBe(1);
      expect(result.tools[0].name).toBe('yaml-test-tool');
    });

    it('should load and validate array of tools', async () => {
      const toolsJson = [
        {
          name: 'tool-one',
          description: 'First tool in the array for testing.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'tool-two',
          description: 'Second tool in the array for testing.',
          inputSchema: { type: 'object', properties: {} },
        },
      ];

      const filePath = join(testDir, 'tools.json');
      await writeFile(filePath, JSON.stringify(toolsJson, null, 2));

      const result = await validateFile(filePath);

      expect(result.summary.totalTools).toBe(2);
      expect(result.tools.map((t) => t.name)).toContain('tool-one');
      expect(result.tools.map((t) => t.name)).toContain('tool-two');
    });

    it('should throw for unsupported file extension', async () => {
      const filePath = join(testDir, 'tool.txt');
      await writeFile(filePath, '{}');

      await expect(validateFile(filePath)).rejects.toThrow(/Unsupported file format/);
    });

    it('should throw for invalid JSON', async () => {
      const filePath = join(testDir, 'invalid.json');
      await writeFile(filePath, '{ invalid json }');

      await expect(validateFile(filePath)).rejects.toThrow(/Failed to parse JSON/);
    });
  });

  describe('validateServer()', () => {
    // Note: validateServer() requires a live MCP server, so we just test that it's exported
    // and callable. Full integration tests would require a mock server.

    it('should be a function', () => {
      expect(typeof validateServer).toBe('function');
    });

    it('should reject with error for invalid server', async () => {
      // This should fail to connect to a non-existent server
      await expect(
        validateServer('http://localhost:99999/nonexistent', { config: {} })
      ).rejects.toThrow();
    });
  });

  describe('config options', () => {
    it('should accept config overrides', async () => {
      const tools = [createValidTool()];

      const result = await validate(tools, {
        config: {
          output: { format: 'json', verbose: true, color: false },
        },
      });

      // Config doesn't change output directly, but we can verify validation still works
      expect(result.valid).toBe(true);
    });

    it('should load config from file path when provided', async () => {
      const baseTmpDir = await realpath(tmpdir());
      const testDir = join(baseTmpDir, `mcp-validator-config-test-${Date.now()}`);
      await mkdir(testDir, { recursive: true });

      try {
        // Create a config file that disables NAM-002
        const configYaml = `
rules:
  NAM-002: false
output:
  format: human
  verbose: false
  color: true
`;
        const configPath = join(testDir, 'mcp-validate.config.yaml');
        await writeFile(configPath, configYaml);

        // Tool with short name that would normally trigger NAM-002
        const tools = [createInvalidTool({ name: 'ab' })]; // Very short name

        const result = await validate(tools, { configPath });

        // NAM-002 should not appear in issues since it's disabled
        const nam002Issues = result.issues.filter((i) => i.id === 'NAM-002');
        expect(nam002Issues).toHaveLength(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });
});
