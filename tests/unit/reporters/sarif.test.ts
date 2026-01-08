/**
 * SARIF reporter tests
 */

import { describe, it, expect } from 'vitest';
import { formatSarifOutput } from '../../../src/reporters/sarif.js';
import type { ValidationResult } from '../../../src/types/index.js';
import type { SarifLog } from '../../../src/reporters/sarif.js';

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

describe('SARIF Reporter', () => {
  describe('formatSarifOutput', () => {
    it('should produce valid SARIF 2.1.0 structure', () => {
      const output = formatSarifOutput(mockResult);
      const parsed: SarifLog = JSON.parse(output);

      expect(parsed.$schema).toBe('https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json');
      expect(parsed.version).toBe('2.1.0');
      expect(parsed.runs).toBeDefined();
      expect(Array.isArray(parsed.runs)).toBe(true);
      expect(parsed.runs.length).toBe(1);
    });

    it('should include tool driver information', () => {
      const output = formatSarifOutput(mockResult);
      const parsed: SarifLog = JSON.parse(output);

      const driver = parsed.runs[0].tool.driver;
      expect(driver.name).toBe('mcp-tool-validator');
      expect(driver.version).toBe('0.1.0');
      expect(driver.informationUri).toBeDefined();
    });

    it('should map severity error to SARIF level error', () => {
      const output = formatSarifOutput(mockResult);
      const parsed: SarifLog = JSON.parse(output);

      const errorResult = parsed.runs[0].results.find(r => r.ruleId === 'SCH-001');
      expect(errorResult).toBeDefined();
      expect(errorResult?.level).toBe('error');
    });

    it('should map severity warning to SARIF level warning', () => {
      const output = formatSarifOutput(mockResult);
      const parsed: SarifLog = JSON.parse(output);

      const warningResult = parsed.runs[0].results.find(r => r.ruleId === 'LLM-002');
      expect(warningResult).toBeDefined();
      expect(warningResult?.level).toBe('warning');
    });

    it('should map severity suggestion to SARIF level note', () => {
      const resultWithSuggestion: ValidationResult = {
        ...mockResult,
        issues: [
          { id: 'BP-001', category: 'best-practice', severity: 'suggestion', message: 'Consider adding examples', tool: 'test-tool' },
        ],
        tools: [
          {
            name: 'test-tool',
            valid: true,
            tool: mockResult.tools[0].tool,
            issues: [
              { id: 'BP-001', category: 'best-practice', severity: 'suggestion', message: 'Consider adding examples', tool: 'test-tool' },
            ],
          },
        ],
      };

      const output = formatSarifOutput(resultWithSuggestion);
      const parsed: SarifLog = JSON.parse(output);

      const suggestionResult = parsed.runs[0].results.find(r => r.ruleId === 'BP-001');
      expect(suggestionResult).toBeDefined();
      expect(suggestionResult?.level).toBe('note');
    });

    it('should deduplicate rules', () => {
      // Create a result with duplicate rule IDs across different tools
      const resultWithDuplicateRules: ValidationResult = {
        ...mockResult,
        tools: [
          {
            name: 'test-tool-1',
            valid: false,
            tool: { name: 'test-tool-1', description: 'Test 1', inputSchema: { type: 'object' }, source: { type: 'file', location: 'test.json', raw: {} } },
            issues: [
              { id: 'SCH-001', category: 'schema', severity: 'error', message: 'Missing name', tool: 'test-tool-1' },
            ],
          },
          {
            name: 'test-tool-2',
            valid: false,
            tool: { name: 'test-tool-2', description: 'Test 2', inputSchema: { type: 'object' }, source: { type: 'file', location: 'test.json', raw: {} } },
            issues: [
              { id: 'SCH-001', category: 'schema', severity: 'error', message: 'Missing name', tool: 'test-tool-2' },
            ],
          },
        ],
      };

      const output = formatSarifOutput(resultWithDuplicateRules);
      const parsed: SarifLog = JSON.parse(output);

      // Rules should be deduplicated - only one SCH-001 rule
      const rules = parsed.runs[0].tool.driver.rules;
      const sch001Rules = rules.filter(r => r.id === 'SCH-001');
      expect(sch001Rules.length).toBe(1);

      // But results should have both occurrences
      const sch001Results = parsed.runs[0].results.filter(r => r.ruleId === 'SCH-001');
      expect(sch001Results.length).toBe(2);
    });

    it('should include logical locations with tool name', () => {
      const output = formatSarifOutput(mockResult);
      const parsed: SarifLog = JSON.parse(output);

      const result = parsed.runs[0].results[0];
      expect(result.locations).toBeDefined();
      expect(result.locations?.[0].logicalLocations).toBeDefined();
      expect(result.locations?.[0].logicalLocations?.[0].name).toBe('test-tool');
      expect(result.locations?.[0].logicalLocations?.[0].kind).toBe('tool');
    });

    it('should include path in fullyQualifiedName when present', () => {
      const resultWithPath: ValidationResult = {
        ...mockResult,
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

      const output = formatSarifOutput(resultWithPath);
      const parsed: SarifLog = JSON.parse(output);

      const result = parsed.runs[0].results[0];
      expect(result.locations?.[0].logicalLocations?.[0].fullyQualifiedName).toBe('test-tool.inputSchema.properties.userId');
    });

    it('should use tool name as fullyQualifiedName when path is absent', () => {
      const output = formatSarifOutput(mockResult);
      const parsed: SarifLog = JSON.parse(output);

      const result = parsed.runs[0].results[0];
      expect(result.locations?.[0].logicalLocations?.[0].fullyQualifiedName).toBe('test-tool');
    });

    it('should include rule definitions with defaultConfiguration', () => {
      const output = formatSarifOutput(mockResult);
      const parsed: SarifLog = JSON.parse(output);

      const rules = parsed.runs[0].tool.driver.rules;
      expect(rules.length).toBeGreaterThan(0);

      for (const rule of rules) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.shortDescription).toBeDefined();
        expect(rule.shortDescription.text).toBeDefined();
        expect(rule.defaultConfiguration).toBeDefined();
        expect(rule.defaultConfiguration?.level).toBeDefined();
      }
    });

    it('should produce valid JSON', () => {
      const output = formatSarifOutput(mockResult);

      expect(() => JSON.parse(output)).not.toThrow();
    });
  });
});
