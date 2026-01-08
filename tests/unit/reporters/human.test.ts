/**
 * Human reporter tests
 */

import { describe, it, expect } from 'vitest';
import { formatHumanOutput } from '../../../src/reporters/human.js';
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

describe('Human Reporter', () => {
  describe('formatHumanOutput', () => {
    it('should include tool names in output', () => {
      const output = formatHumanOutput(mockResult);

      expect(output).toContain('test-tool');
      expect(output).toContain('good-tool');
    });

    it('should show correct severity icons for tools with errors', () => {
      const output = formatHumanOutput(mockResult, { color: false });

      // Check that there's a pass icon for good-tool and fail icon for test-tool
      const lines = output.split('\n');
      const testToolLine = lines.find(l => l.includes('test-tool'));
      const goodToolLine = lines.find(l => l.includes('good-tool'));

      expect(testToolLine).toBeDefined();
      expect(goodToolLine).toBeDefined();
    });

    it('should display summary counts correctly', () => {
      const output = formatHumanOutput(mockResult, { color: false });

      expect(output).toContain('Summary: 1/2 tools valid');
      expect(output).toContain('Errors:      1');
      expect(output).toContain('Warnings:    1');
      expect(output).toContain('Suggestions: 0');
    });

    it('should show issues with severity labels', () => {
      const output = formatHumanOutput(mockResult, { color: false });

      expect(output).toContain('ERROR');
      expect(output).toContain('[SCH-001]');
      expect(output).toContain('Missing name');

      expect(output).toContain('WARNING');
      expect(output).toContain('[LLM-002]');
      expect(output).toContain('Short description');
    });

    it('should produce no ANSI codes when color is false', () => {
      const output = formatHumanOutput(mockResult, { color: false });

      // ANSI escape codes start with \x1b[ or \u001b[
      const ansiRegex = /\x1b\[|\u001b\[/;
      expect(ansiRegex.test(output)).toBe(false);
    });

    it('should show validation failed message for invalid results', () => {
      const output = formatHumanOutput(mockResult, { color: false });

      expect(output).toContain('Validation failed with 1 error(s).');
    });

    it('should show validation passed message for valid results', () => {
      const validResult: ValidationResult = {
        ...mockResult,
        valid: true,
        summary: {
          ...mockResult.summary,
          issuesBySeverity: { error: 0, warning: 0, suggestion: 0 },
        },
      };

      const output = formatHumanOutput(validResult, { color: false });

      expect(output).toContain('Validation passed.');
    });

    it('should include issue path when present', () => {
      const resultWithPath: ValidationResult = {
        ...mockResult,
        issues: [
          { id: 'SCH-001', category: 'schema', severity: 'error', message: 'Missing name', tool: 'test-tool', path: 'inputSchema.properties.userId' },
        ],
        tools: [
          {
            name: 'test-tool',
            valid: false,
            tool: mockResult.tools[0].tool,
            issues: [
              { id: 'SCH-001', category: 'schema', severity: 'error', message: 'Missing name', tool: 'test-tool', path: 'inputSchema.properties.userId' },
            ],
          },
        ],
      };

      const output = formatHumanOutput(resultWithPath, { color: false });

      expect(output).toContain('at:');
      expect(output).toContain('inputSchema.properties.userId');
    });

    it('should include suggestion when verbose is true', () => {
      const resultWithSuggestion: ValidationResult = {
        ...mockResult,
        tools: [
          {
            name: 'test-tool',
            valid: false,
            tool: mockResult.tools[0].tool,
            issues: [
              { id: 'SCH-001', category: 'schema', severity: 'error', message: 'Missing name', tool: 'test-tool', suggestion: 'Add a name property' },
            ],
          },
        ],
      };

      const verboseOutput = formatHumanOutput(resultWithSuggestion, { color: false, verbose: true });
      const normalOutput = formatHumanOutput(resultWithSuggestion, { color: false, verbose: false });

      expect(verboseOutput).toContain('suggestion:');
      expect(verboseOutput).toContain('Add a name property');
      expect(normalOutput).not.toContain('suggestion:');
    });

    it('should show category counts in summary', () => {
      const output = formatHumanOutput(mockResult, { color: false });

      expect(output).toContain('By Category:');
      expect(output).toContain('schema: 1');
      expect(output).toContain('llm-compatibility: 1');
    });

    it('should include validator version in header', () => {
      const output = formatHumanOutput(mockResult, { color: false });

      expect(output).toContain('MCP Tool Validator v0.1.0');
    });
  });
});
