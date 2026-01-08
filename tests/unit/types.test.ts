/**
 * Type definition tests
 *
 * These tests verify that the type definitions are correctly exported
 * and can be used as expected.
 */

import { describe, it, expect } from 'vitest';
import type {
  ToolDefinition,
  ToolSource,
  ToolAnnotations,
  ValidationResult,
  ValidationSummary,
  ValidationIssue,
  IssueCategory,
  IssueSeverity,
  ToolValidationResult,
  ValidationMetadata,
  ValidatorConfig,
  RuleConfig,
  OutputConfig,
  LLMConfig,
  JSONSchema,
} from '../../src/types/index.js';

describe('Type Definitions', () => {
  describe('ToolDefinition', () => {
    it('should accept a valid tool definition', () => {
      const tool: ToolDefinition = {
        name: 'get-user',
        description: 'Retrieves a user by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        source: {
          type: 'file',
          location: '/path/to/tools.json',
          raw: {},
        },
      };

      expect(tool.name).toBe('get-user');
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.source.type).toBe('file');
    });

    it('should accept tool annotations', () => {
      const annotations: ToolAnnotations = {
        title: 'Get User',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      };

      expect(annotations.readOnlyHint).toBe(true);
    });
  });

  describe('ValidationResult', () => {
    it('should accept a valid validation result', () => {
      const result: ValidationResult = {
        valid: true,
        summary: {
          totalTools: 1,
          validTools: 1,
          issuesByCategory: {
            schema: 0,
            security: 0,
            'llm-compatibility': 0,
            naming: 0,
            'best-practice': 0,
          },
          issuesBySeverity: {
            error: 0,
            warning: 0,
            suggestion: 0,
          },
        },
        issues: [],
        tools: [],
        metadata: {
          validatorVersion: '1.0.0',
          mcpSpecVersion: '2025-11-25',
          timestamp: new Date().toISOString(),
          duration: 100,
          configUsed: '',
          llmAnalysisUsed: false,
        },
      };

      expect(result.valid).toBe(true);
      expect(result.summary.totalTools).toBe(1);
    });
  });

  describe('ValidationIssue', () => {
    it('should accept a valid validation issue', () => {
      const issue: ValidationIssue = {
        id: 'SEC-001',
        category: 'security',
        severity: 'error',
        message: 'String parameter missing maxLength constraint',
        tool: 'get-user',
        path: 'inputSchema.properties.userId',
        suggestion: 'Add "maxLength": 100',
        documentation: 'https://example.com/docs/SEC-001',
      };

      expect(issue.id).toBe('SEC-001');
      expect(issue.category).toBe('security');
      expect(issue.severity).toBe('error');
    });
  });

  describe('IssueCategory', () => {
    it('should accept all valid categories', () => {
      const categories: IssueCategory[] = [
        'schema',
        'security',
        'llm-compatibility',
        'naming',
        'best-practice',
      ];

      expect(categories).toHaveLength(5);
    });
  });

  describe('IssueSeverity', () => {
    it('should accept all valid severities', () => {
      const severities: IssueSeverity[] = ['error', 'warning', 'suggestion'];

      expect(severities).toHaveLength(3);
    });
  });

  describe('ValidatorConfig', () => {
    it('should accept a valid configuration', () => {
      const config: ValidatorConfig = {
        rules: {
          'SEC-001': true,
          'SEC-002': false,
          'LLM-001': 'warning',
        },
        output: {
          format: 'human',
          verbose: false,
          color: true,
        },
        llm: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      };

      expect(config.rules['SEC-001']).toBe(true);
      expect(config.output.format).toBe('human');
      expect(config.llm?.provider).toBe('anthropic');
    });
  });

  describe('LLMConfig', () => {
    it('should accept custom provider strings', () => {
      const config: LLMConfig = {
        enabled: true,
        provider: 'custom-provider',
        model: 'custom-model',
        apiKey: 'sk-xxx',
        baseUrl: 'https://api.example.com',
        timeout: 60000,
      };

      expect(config.provider).toBe('custom-provider');
      expect(config.baseUrl).toBe('https://api.example.com');
    });
  });
});
