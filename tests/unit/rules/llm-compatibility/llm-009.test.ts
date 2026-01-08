/**
 * Tests for LLM-009: Include parameter constraints in description
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-009.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool description',
    inputSchema: { type: 'object', properties: {} },
    source: { type: 'file', location: 'test.json', raw: {} },
    ...overrides,
  };
}

function createContext(tools: ToolDefinition[] = []): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('LLM-009: Include parameter constraints in description', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-009');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should pass for parameter without constraints', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the user',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass when maxLength is mentioned in description', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            maxLength: 100,
            description: 'The name of the user (max 100 characters)',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail when maxLength is not mentioned', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            maxLength: 100,
            description: 'The name of the user',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-009');
    expect(issues[0].message).toContain('maximum length');
  });

  it('should pass when enum values are documented', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
            description: 'Status must be one of: active, inactive, pending',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail when enum values are not documented', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
            description: 'The current status of the item',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('allowed values');
  });

  it('should pass when minimum is mentioned', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          age: {
            type: 'integer',
            minimum: 18,
            description: 'User age (minimum 18)',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail when minimum is not mentioned', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          age: {
            type: 'integer',
            minimum: 18,
            description: 'User age',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('minimum value');
  });

  it('should pass when maximum is mentioned', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            type: 'integer',
            maximum: 100,
            description: 'Number of items (max 100)',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass when pattern is mentioned via format', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
            description: 'Valid email format required',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should report multiple missing constraints', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            minLength: 3,
            maxLength: 10,
            pattern: '^[A-Z]+$',
            description: 'The code value',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    // Should mention multiple constraints
    expect(issues[0].message).toMatch(/minimum length|maximum length|format pattern/);
  });

  it('should handle missing inputSchema gracefully', () => {
    const tool = createTool();
    // @ts-expect-error - testing missing inputSchema
    tool.inputSchema = undefined;
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });
});
