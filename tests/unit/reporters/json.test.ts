/**
 * JSON reporter tests
 */

import { describe, it, expect } from 'vitest';
import { formatJsonOutput } from '../../../src/reporters/json.js';
import type { ValidationResult } from '../../../src/types/index.js';

const mockResult: ValidationResult = {
  valid: false,
  summary: {
    totalTools: 2,
    validTools: 1,
    issuesByCategory: { schema: 1, security: 0, 'llm-compatibility': 1, naming: 0, 'best-practice': 0 },
    issuesBySeverity: { error: 1, warning: 1, suggestion: 0 },
  },
  issues: [
    { id: 'SCH-001', category: 'schema', severity: 'error', message: 'Missing name', tool: 'test-tool' },
    { id: 'LLM-002', category: 'llm-compatibility', severity: 'warning', message: 'Short description', tool: 'test-tool' },
  ],
  tools: [
    {
      name: 'test-tool',
      valid: false,
      tool: { name: 'test-tool', description: 'Test', inputSchema: { type: 'object' }, source: { type: 'file', location: 'test.json', raw: {} } },
      issues: [
        { id: 'SCH-001', category: 'schema', severity: 'error', message: 'Missing name', tool: 'test-tool' },
        { id: 'LLM-002', category: 'llm-compatibility', severity: 'warning', message: 'Short description', tool: 'test-tool' },
      ],
    },
    {
      name: 'good-tool',
      valid: true,
      tool: { name: 'good-tool', description: 'A good tool', inputSchema: { type: 'object' }, source: { type: 'file', location: 'test.json', raw: {} } },
      issues: [],
    },
  ],
  metadata: {
    validatorVersion: '0.1.0',
    mcpSpecVersion: '2025-11-25',
    timestamp: '2025-01-07T12:00:00Z',
    duration: 100,
    configUsed: '',
    llmAnalysisUsed: false,
  },
};

describe('JSON Reporter', () => {
  describe('formatJsonOutput', () => {
    it('should produce valid JSON', () => {
      const output = formatJsonOutput(mockResult);

      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should output structure matching ValidationResult', () => {
      const output = formatJsonOutput(mockResult);
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('valid');
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('issues');
      expect(parsed).toHaveProperty('tools');
      expect(parsed).toHaveProperty('metadata');
    });

    it('should preserve all validation result data', () => {
      const output = formatJsonOutput(mockResult);
      const parsed = JSON.parse(output);

      expect(parsed.valid).toBe(false);
      expect(parsed.summary.totalTools).toBe(2);
      expect(parsed.summary.validTools).toBe(1);
      expect(parsed.issues).toHaveLength(2);
      expect(parsed.tools).toHaveLength(2);
    });

    it('should preserve summary data', () => {
      const output = formatJsonOutput(mockResult);
      const parsed = JSON.parse(output);

      expect(parsed.summary.issuesBySeverity.error).toBe(1);
      expect(parsed.summary.issuesBySeverity.warning).toBe(1);
      expect(parsed.summary.issuesBySeverity.suggestion).toBe(0);
      expect(parsed.summary.issuesByCategory.schema).toBe(1);
      expect(parsed.summary.issuesByCategory['llm-compatibility']).toBe(1);
    });

    it('should preserve issue data', () => {
      const output = formatJsonOutput(mockResult);
      const parsed = JSON.parse(output);

      const firstIssue = parsed.issues[0];
      expect(firstIssue.id).toBe('SCH-001');
      expect(firstIssue.category).toBe('schema');
      expect(firstIssue.severity).toBe('error');
      expect(firstIssue.message).toBe('Missing name');
      expect(firstIssue.tool).toBe('test-tool');
    });

    it('should preserve tool data', () => {
      const output = formatJsonOutput(mockResult);
      const parsed = JSON.parse(output);

      const firstTool = parsed.tools[0];
      expect(firstTool.name).toBe('test-tool');
      expect(firstTool.valid).toBe(false);
      expect(firstTool.tool.name).toBe('test-tool');
      expect(firstTool.tool.description).toBe('Test');
      expect(firstTool.issues).toHaveLength(2);
    });

    it('should preserve metadata', () => {
      const output = formatJsonOutput(mockResult);
      const parsed = JSON.parse(output);

      expect(parsed.metadata.validatorVersion).toBe('0.1.0');
      expect(parsed.metadata.mcpSpecVersion).toBe('2025-11-25');
      expect(parsed.metadata.timestamp).toBe('2025-01-07T12:00:00Z');
      expect(parsed.metadata.duration).toBe(100);
      expect(parsed.metadata.configUsed).toBe('');
      expect(parsed.metadata.llmAnalysisUsed).toBe(false);
    });

    it('should be pretty-printed with 2-space indentation', () => {
      const output = formatJsonOutput(mockResult);

      // Pretty-printed JSON should have newlines
      expect(output).toContain('\n');
      // And 2-space indentation
      expect(output).toContain('  "valid"');
    });
  });
});
