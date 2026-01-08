/**
 * BP-005: Tools with many parameters (>10) should be split
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-005.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool',
    inputSchema: { type: 'object', properties: {} },
    source: { type: 'file', location: '/test.json', raw: {} },
    ...overrides,
  };
}

function createContext(tools: ToolDefinition[] = []): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

function createProperties(count: number): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (let i = 1; i <= count; i++) {
    props[`param${i}`] = { type: 'string' };
  }
  return props;
}

describe('BP-005: parameter count limit', () => {
  it('should pass with 5 parameters', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: createProperties(5),
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass with 10 parameters (limit)', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: createProperties(10),
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue with 11 parameters', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: createProperties(11),
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-005');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('11 parameters');
    expect(issues[0].message).toContain('exceeds');
    expect(issues[0].path).toBe('inputSchema.properties');
  });

  it('should report issue with 15 parameters', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: createProperties(15),
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('15 parameters');
  });

  it('should pass with empty properties', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {},
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass when properties is missing', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-005');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('warning');
  });
});
