/**
 * BP-006: Use $ref for repeated schema patterns
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-006.js';
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

function createContext(tools: ToolDefinition[]): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('BP-006: repeated schema patterns', () => {
  it('should pass with unique schemas', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should detect repeated complex schemas across tools', () => {
    const addressSchema = {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        zip: { type: 'string' },
      },
    };

    const tool1 = createTool({
      name: 'create-user',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: addressSchema,
        },
      },
    });

    const tool2 = createTool({
      name: 'update-user',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          address: addressSchema,
        },
      },
    });

    const ctx = createContext([tool1, tool2]);

    const issues = rule.check(tool1, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-006');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message).toContain('address');
    expect(issues[0].message).toContain('update-user');
    expect(issues[0].suggestion).toContain('$ref');
  });

  it('should detect repeated patterns within same tool', () => {
    const addressSchema = {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
      },
    };

    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          homeAddress: addressSchema,
          workAddress: addressSchema,
        },
      },
    });

    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    // Should find issues for both properties (each one is repeated)
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].id).toBe('BP-006');
  });

  it('should not flag simple type schemas', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should detect repeated array of objects schema', () => {
    const itemsSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
    };

    const tool1 = createTool({
      name: 'list-orders',
      inputSchema: {
        type: 'object',
        properties: {
          orders: itemsSchema,
        },
      },
    });

    const tool2 = createTool({
      name: 'batch-process',
      inputSchema: {
        type: 'object',
        properties: {
          items: itemsSchema,
        },
      },
    });

    const ctx = createContext([tool1, tool2]);

    const issues = rule.check(tool1, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-006');
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-006');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });
});
