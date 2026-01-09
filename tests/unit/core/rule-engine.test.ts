/**
 * Rule Engine Tests
 *
 * Tests for rule execution, aggregation, and related functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  executeRules,
  aggregateResults,
  flattenIssues,
  calculateMaturityScore,
  getMaturityLevel,
} from '../../../src/core/rule-engine.js';
import { getEffectiveSeverity } from '../../../src/core/rule-loader.js';
import type { Rule, RuleContext, ToolRuleResults } from '../../../src/rules/types.js';
import type {
  ToolDefinition,
  RuleConfig,
  ValidationIssue,
} from '../../../src/types/index.js';

// Helper to create a mock tool
function createMockTool(name: string = 'test-tool'): ToolDefinition {
  return {
    name,
    description: 'A test tool for validation',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    source: {
      type: 'file',
      location: '/test/tools.json',
      raw: {},
    },
  };
}

// Mock rule that always passes
const passingRule: Rule = {
  id: 'PASS-001',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'A rule that always passes',
  check: () => [],
};

// Mock rule that fails when tool name is empty
const emptyNameRule: Rule = {
  id: 'TEST-001',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'Checks that tool name is not empty',
  check: (tool: ToolDefinition): ValidationIssue[] =>
    tool.name === ''
      ? [
          {
            id: 'TEST-001',
            category: 'schema',
            severity: 'error',
            message: 'Name is empty',
            tool: tool.name,
          },
        ]
      : [],
};

// Mock rule that always fails with security category
const securityRule: Rule = {
  id: 'SEC-TEST',
  category: 'security',
  defaultSeverity: 'warning',
  description: 'A security rule that always fails',
  check: (tool: ToolDefinition): ValidationIssue[] => [
    {
      id: 'SEC-TEST',
      category: 'security',
      severity: 'warning',
      message: 'Security issue detected',
      tool: tool.name,
    },
  ],
};

// Mock rule that uses context
const contextAwareRule: Rule = {
  id: 'CTX-001',
  category: 'best-practice',
  defaultSeverity: 'suggestion',
  description: 'A rule that uses context',
  check: (tool: ToolDefinition, ctx: RuleContext): ValidationIssue[] => {
    // Fail if there are multiple tools
    if (ctx.allTools.length > 1) {
      return [
        {
          id: 'CTX-001',
          category: 'best-practice',
          severity: 'suggestion',
          message: `Multiple tools detected (${ctx.allTools.length})`,
          tool: tool.name,
        },
      ];
    }
    return [];
  },
};

describe('Rule Engine', () => {
  describe('executeRules', () => {
    it('should return empty issues for passing rules', () => {
      const tools = [createMockTool()];
      const rules = [passingRule];
      const config: RuleConfig = {};

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(1);
      expect(results[0].issues).toHaveLength(0);
      expect(results[0].tool.name).toBe('test-tool');
    });

    it('should detect issues with failing rules', () => {
      const tool = createMockTool('');
      const tools = [tool];
      const rules = [emptyNameRule];
      const config: RuleConfig = {};

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(1);
      expect(results[0].issues).toHaveLength(1);
      expect(results[0].issues[0].id).toBe('TEST-001');
      expect(results[0].issues[0].message).toBe('Name is empty');
    });

    it('should skip disabled rules (config: false)', () => {
      const tools = [createMockTool()];
      const rules = [securityRule];
      const config: RuleConfig = { 'SEC-TEST': false };

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(1);
      expect(results[0].issues).toHaveLength(0);
    });

    it('should override severity from config', () => {
      const tools = [createMockTool()];
      const rules = [securityRule];
      const config: RuleConfig = { 'SEC-TEST': 'error' };

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(1);
      expect(results[0].issues).toHaveLength(1);
      expect(results[0].issues[0].severity).toBe('error');
    });

    it('should pass context to rules', () => {
      const tools = [createMockTool('tool-1'), createMockTool('tool-2')];
      const rules = [contextAwareRule];
      const config: RuleConfig = {};

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(2);
      // Both tools should have issues because there are multiple tools
      expect(results[0].issues).toHaveLength(1);
      expect(results[1].issues).toHaveLength(1);
      expect(results[0].issues[0].message).toContain('Multiple tools detected');
    });

    it('should execute multiple rules against each tool', () => {
      const tool = createMockTool('');
      const tools = [tool];
      const rules = [emptyNameRule, securityRule];
      const config: RuleConfig = {};

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(1);
      expect(results[0].issues).toHaveLength(2);
      const issueIds = results[0].issues.map((i) => i.id);
      expect(issueIds).toContain('TEST-001');
      expect(issueIds).toContain('SEC-TEST');
    });

    it('should handle empty tools array', () => {
      const tools: ToolDefinition[] = [];
      const rules = [emptyNameRule];
      const config: RuleConfig = {};

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(0);
    });

    it('should handle empty rules array', () => {
      const tools = [createMockTool()];
      const rules: Rule[] = [];
      const config: RuleConfig = {};

      const results = executeRules(tools, rules, config);

      expect(results).toHaveLength(1);
      expect(results[0].issues).toHaveLength(0);
    });
  });

  describe('getEffectiveSeverity', () => {
    it('should return rule default severity when not configured', () => {
      const config: RuleConfig = {};
      const severity = getEffectiveSeverity(emptyNameRule, config);
      expect(severity).toBe('error');
    });

    it('should return config severity when configured as string', () => {
      const config: RuleConfig = { 'TEST-001': 'warning' };
      const severity = getEffectiveSeverity(emptyNameRule, config);
      expect(severity).toBe('warning');
    });

    it('should return rule default when config is boolean true', () => {
      const config: RuleConfig = { 'TEST-001': true };
      const severity = getEffectiveSeverity(emptyNameRule, config);
      expect(severity).toBe('error');
    });
  });

  describe('aggregateResults', () => {
    it('should compute correct summary for empty results', () => {
      const results: ToolRuleResults[] = [];
      const summary = aggregateResults(results);

      expect(summary.totalTools).toBe(0);
      expect(summary.validTools).toBe(0);
      expect(summary.issuesByCategory.schema).toBe(0);
      expect(summary.issuesBySeverity.error).toBe(0);
      expect(summary.maturityScore).toBe(100);
      expect(summary.maturityLevel).toBe('exemplary');
    });

    it('should count valid tools (no errors)', () => {
      const results: ToolRuleResults[] = [
        {
          tool: createMockTool('tool-1'),
          issues: [],
        },
        {
          tool: createMockTool('tool-2'),
          issues: [
            {
              id: 'TEST',
              category: 'schema',
              severity: 'warning',
              message: 'Warning only',
              tool: 'tool-2',
            },
          ],
        },
      ];

      const summary = aggregateResults(results);

      expect(summary.totalTools).toBe(2);
      expect(summary.validTools).toBe(2); // Both valid - warnings don't invalidate
    });

    it('should count invalid tools (has errors)', () => {
      const results: ToolRuleResults[] = [
        {
          tool: createMockTool('tool-1'),
          issues: [
            {
              id: 'TEST',
              category: 'schema',
              severity: 'error',
              message: 'Error found',
              tool: 'tool-1',
            },
          ],
        },
      ];

      const summary = aggregateResults(results);

      expect(summary.totalTools).toBe(1);
      expect(summary.validTools).toBe(0);
    });

    it('should count issues by category', () => {
      const results: ToolRuleResults[] = [
        {
          tool: createMockTool(),
          issues: [
            {
              id: 'SCH-1',
              category: 'schema',
              severity: 'error',
              message: 'Schema error',
              tool: 'test',
            },
            {
              id: 'SCH-2',
              category: 'schema',
              severity: 'warning',
              message: 'Schema warning',
              tool: 'test',
            },
            {
              id: 'SEC-1',
              category: 'security',
              severity: 'error',
              message: 'Security error',
              tool: 'test',
            },
            {
              id: 'LLM-1',
              category: 'llm-compatibility',
              severity: 'suggestion',
              message: 'LLM suggestion',
              tool: 'test',
            },
          ],
        },
      ];

      const summary = aggregateResults(results);

      expect(summary.issuesByCategory.schema).toBe(2);
      expect(summary.issuesByCategory.security).toBe(1);
      expect(summary.issuesByCategory['llm-compatibility']).toBe(1);
      expect(summary.issuesByCategory.naming).toBe(0);
      expect(summary.issuesByCategory['best-practice']).toBe(0);
    });

    it('should count issues by severity', () => {
      const results: ToolRuleResults[] = [
        {
          tool: createMockTool(),
          issues: [
            {
              id: 'E1',
              category: 'schema',
              severity: 'error',
              message: 'Error 1',
              tool: 'test',
            },
            {
              id: 'E2',
              category: 'schema',
              severity: 'error',
              message: 'Error 2',
              tool: 'test',
            },
            {
              id: 'W1',
              category: 'security',
              severity: 'warning',
              message: 'Warning 1',
              tool: 'test',
            },
            {
              id: 'S1',
              category: 'naming',
              severity: 'suggestion',
              message: 'Suggestion 1',
              tool: 'test',
            },
            {
              id: 'S2',
              category: 'naming',
              severity: 'suggestion',
              message: 'Suggestion 2',
              tool: 'test',
            },
            {
              id: 'S3',
              category: 'naming',
              severity: 'suggestion',
              message: 'Suggestion 3',
              tool: 'test',
            },
          ],
        },
      ];

      const summary = aggregateResults(results);

      expect(summary.issuesBySeverity.error).toBe(2);
      expect(summary.issuesBySeverity.warning).toBe(1);
      expect(summary.issuesBySeverity.suggestion).toBe(3);
    });
  });

  describe('flattenIssues', () => {
    it('should return empty array for empty results', () => {
      const results: ToolRuleResults[] = [];
      const issues = flattenIssues(results);
      expect(issues).toHaveLength(0);
    });

    it('should flatten issues from multiple tools', () => {
      const results: ToolRuleResults[] = [
        {
          tool: createMockTool('tool-1'),
          issues: [
            {
              id: 'A',
              category: 'schema',
              severity: 'error',
              message: 'Issue A',
              tool: 'tool-1',
            },
            {
              id: 'B',
              category: 'schema',
              severity: 'error',
              message: 'Issue B',
              tool: 'tool-1',
            },
          ],
        },
        {
          tool: createMockTool('tool-2'),
          issues: [
            {
              id: 'C',
              category: 'security',
              severity: 'warning',
              message: 'Issue C',
              tool: 'tool-2',
            },
          ],
        },
        {
          tool: createMockTool('tool-3'),
          issues: [],
        },
      ];

      const issues = flattenIssues(results);

      expect(issues).toHaveLength(3);
      expect(issues.map((i) => i.id)).toEqual(['A', 'B', 'C']);
    });
  });

  describe('calculateMaturityScore', () => {
    it('should return 100 for no issues', () => {
      const issuesBySeverity = { error: 0, warning: 0, suggestion: 0 };
      expect(calculateMaturityScore(issuesBySeverity)).toBe(100);
    });

    it('should deduct 5 points per error', () => {
      const issuesBySeverity = { error: 2, warning: 0, suggestion: 0 };
      expect(calculateMaturityScore(issuesBySeverity)).toBe(90); // 100 - 2*5
    });

    it('should deduct 2 points per warning', () => {
      const issuesBySeverity = { error: 0, warning: 3, suggestion: 0 };
      expect(calculateMaturityScore(issuesBySeverity)).toBe(94); // 100 - 3*2
    });

    it('should deduct 1 point per suggestion', () => {
      const issuesBySeverity = { error: 0, warning: 0, suggestion: 5 };
      expect(calculateMaturityScore(issuesBySeverity)).toBe(95); // 100 - 5*1
    });

    it('should combine deductions from all severities', () => {
      const issuesBySeverity = { error: 2, warning: 3, suggestion: 4 };
      // 100 - 2*5 - 3*2 - 4*1 = 100 - 10 - 6 - 4 = 80
      expect(calculateMaturityScore(issuesBySeverity)).toBe(80);
    });

    it('should floor at 0 for many issues', () => {
      const issuesBySeverity = { error: 25, warning: 0, suggestion: 0 };
      // 100 - 25*5 = 100 - 125 = -25 -> floored to 0
      expect(calculateMaturityScore(issuesBySeverity)).toBe(0);
    });
  });

  describe('getMaturityLevel', () => {
    it('should return exemplary for scores 91-100', () => {
      expect(getMaturityLevel(100)).toBe('exemplary');
      expect(getMaturityLevel(95)).toBe('exemplary');
      expect(getMaturityLevel(91)).toBe('exemplary');
    });

    it('should return mature for scores 71-90', () => {
      expect(getMaturityLevel(90)).toBe('mature');
      expect(getMaturityLevel(80)).toBe('mature');
      expect(getMaturityLevel(71)).toBe('mature');
    });

    it('should return moderate for scores 41-70', () => {
      expect(getMaturityLevel(70)).toBe('moderate');
      expect(getMaturityLevel(55)).toBe('moderate');
      expect(getMaturityLevel(41)).toBe('moderate');
    });

    it('should return immature for scores 0-40', () => {
      expect(getMaturityLevel(40)).toBe('immature');
      expect(getMaturityLevel(20)).toBe('immature');
      expect(getMaturityLevel(0)).toBe('immature');
    });
  });

  describe('aggregateResults maturity', () => {
    it('should include maturity score and level in summary', () => {
      const results: ToolRuleResults[] = [
        {
          tool: createMockTool(),
          issues: [
            {
              id: 'E1',
              category: 'schema',
              severity: 'error',
              message: 'Error 1',
              tool: 'test',
            },
            {
              id: 'W1',
              category: 'security',
              severity: 'warning',
              message: 'Warning 1',
              tool: 'test',
            },
          ],
        },
      ];

      const summary = aggregateResults(results);

      // 100 - 1*5 - 1*2 = 93
      expect(summary.maturityScore).toBe(93);
      expect(summary.maturityLevel).toBe('exemplary');
    });

    it('should compute immature level for many errors', () => {
      const results: ToolRuleResults[] = [
        {
          tool: createMockTool(),
          issues: Array(15).fill(null).map((_, i) => ({
            id: `E${i}`,
            category: 'schema' as const,
            severity: 'error' as const,
            message: `Error ${i}`,
            tool: 'test',
          })),
        },
      ];

      const summary = aggregateResults(results);

      // 100 - 15*5 = 25
      expect(summary.maturityScore).toBe(25);
      expect(summary.maturityLevel).toBe('immature');
    });
  });
});
