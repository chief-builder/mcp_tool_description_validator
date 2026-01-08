/**
 * Validator Integration Tests
 *
 * End-to-end tests for the validation API using real fixtures and the full rule set.
 */

import { describe, it, expect } from 'vitest';
import { validate, validateFile } from '../../src/index.js';
import path from 'node:path';

describe('Validator Integration', () => {
  describe('validate() end-to-end', () => {
    it('should validate tool definitions end-to-end', async () => {
      const tools = [
        {
          name: 'test-tool',
          description: 'A test tool for validation that performs comprehensive testing operations.',
          inputSchema: {
            type: 'object' as const,
            properties: {
              query: {
                type: 'string',
                description: 'Search query to execute',
                maxLength: 100,
              },
            },
            required: ['query'],
          },
          source: { type: 'file' as const, location: 'test.json', raw: {} },
        },
      ];

      const result = await validate(tools);

      expect(result.metadata.validatorVersion).toBe('0.1.0');
      expect(result.metadata.mcpSpecVersion).toBe('2025-11-25');
      expect(result.tools).toHaveLength(1);
      expect(result.summary.totalTools).toBe(1);
      expect(typeof result.metadata.duration).toBe('number');
      expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should detect common validation issues', async () => {
      const tools = [
        {
          name: 'a', // Too short
          description: 'short', // Too short
          inputSchema: {
            type: 'object' as const,
            properties: {
              password: { type: 'string' }, // Security issue: missing description
            },
          },
          source: { type: 'file' as const, location: 'test.json', raw: {} },
        },
      ];

      const result = await validate(tools);

      // Should have multiple issues
      expect(result.issues.length).toBeGreaterThan(0);

      // Check that issues have required properties
      for (const issue of result.issues) {
        expect(issue.id).toBeDefined();
        expect(issue.category).toBeDefined();
        expect(issue.severity).toBeDefined();
        expect(issue.message).toBeDefined();
        expect(issue.tool).toBe('a');
      }
    });

    it('should handle tools with annotations', async () => {
      const tools = [
        {
          name: 'delete-resource',
          description: 'Delete a resource permanently from the database. This is a destructive operation.',
          inputSchema: {
            type: 'object' as const,
            properties: {
              resourceId: {
                type: 'string',
                description: 'The unique identifier of the resource to delete',
              },
            },
            required: ['resourceId'],
          },
          annotations: {
            title: 'Delete Resource',
            destructiveHint: true,
            readOnlyHint: false,
            idempotentHint: false,
          },
          source: { type: 'file' as const, location: 'test.json', raw: {} },
        },
      ];

      const result = await validate(tools);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].tool.annotations?.destructiveHint).toBe(true);
    });
  });

  describe('validateFile() with fixtures', () => {
    it('should validate single-tool.json fixture', async () => {
      const result = await validateFile(
        path.join(process.cwd(), 'tests/fixtures/single-tool.json')
      );

      expect(result.tools).toHaveLength(1);
      expect(result.summary.totalTools).toBe(1);
      expect(result.tools[0].name).toBe('get-user');
    });

    it('should validate bare-array.json fixture', async () => {
      const result = await validateFile(
        path.join(process.cwd(), 'tests/fixtures/bare-array.json')
      );

      expect(result.tools.length).toBeGreaterThanOrEqual(1);
      expect(result.summary.totalTools).toBeGreaterThanOrEqual(1);
    });

    it('should validate tool-array.json fixture', async () => {
      const result = await validateFile(
        path.join(process.cwd(), 'tests/fixtures/tool-array.json')
      );

      expect(result.tools.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('library exports', () => {
    it('should export all main functions from index', async () => {
      const exports = await import('../../src/index.js');

      // Core validation functions
      expect(typeof exports.validate).toBe('function');
      expect(typeof exports.validateFile).toBe('function');
      expect(typeof exports.validateServer).toBe('function');

      // Configuration functions
      expect(typeof exports.loadConfig).toBe('function');
      expect(typeof exports.mergeConfig).toBe('function');
      expect(typeof exports.getDefaultConfig).toBe('function');

      // Reporter functions
      expect(typeof exports.formatHumanOutput).toBe('function');
      expect(typeof exports.formatJsonOutput).toBe('function');
      expect(typeof exports.formatSarifOutput).toBe('function');

      // Parser functions
      expect(typeof exports.parseFile).toBe('function');
      expect(typeof exports.connectToServer).toBe('function');
      expect(typeof exports.getToolDefinitions).toBe('function');
      expect(typeof exports.disconnect).toBe('function');
      expect(typeof exports.fetchToolsFromServer).toBe('function');
    });
  });

  describe('validation result structure', () => {
    it('should return complete ValidationResult structure', async () => {
      const tools = [
        {
          name: 'structure-test',
          description: 'A tool to test the validation result structure.',
          inputSchema: {
            type: 'object' as const,
            properties: {},
          },
          source: { type: 'file' as const, location: 'test.json', raw: {} },
        },
      ];

      const result = await validate(tools);

      // Check top-level structure
      expect(typeof result.valid).toBe('boolean');
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.metadata).toBeDefined();

      // Check summary structure
      expect(typeof result.summary.totalTools).toBe('number');
      expect(typeof result.summary.validTools).toBe('number');
      expect(result.summary.issuesByCategory).toBeDefined();
      expect(result.summary.issuesBySeverity).toBeDefined();

      // Check metadata structure
      expect(result.metadata.validatorVersion).toBeDefined();
      expect(result.metadata.mcpSpecVersion).toBeDefined();
      expect(result.metadata.timestamp).toBeDefined();
      expect(typeof result.metadata.duration).toBe('number');
      expect(typeof result.metadata.llmAnalysisUsed).toBe('boolean');

      // Check tool result structure
      if (result.tools.length > 0) {
        const toolResult = result.tools[0];
        expect(typeof toolResult.name).toBe('string');
        expect(typeof toolResult.valid).toBe('boolean');
        expect(Array.isArray(toolResult.issues)).toBe(true);
        expect(toolResult.tool).toBeDefined();
      }
    });
  });
});
