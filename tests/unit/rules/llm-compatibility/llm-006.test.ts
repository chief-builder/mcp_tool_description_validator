/**
 * Tests for LLM-006: Each parameter must have a description
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-006.js';
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

describe('LLM-006: Each parameter must have a description', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-006');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass for parameters with descriptions', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The unique identifier of the user',
          },
          email: {
            type: 'string',
            description: 'The email address of the user',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for parameter without description', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-006');
    expect(issues[0].message).toContain('userId');
    expect(issues[0].path).toBe('inputSchema.properties.userId.description');
  });

  it('should fail for parameter with empty description', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: '',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-006');
  });

  it('should fail for parameter with whitespace-only description', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: '   ',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-006');
  });

  it('should report multiple parameters without descriptions', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string', description: 'User name' },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(2);
    const messages = issues.map(i => i.message);
    expect(messages.some(m => m.includes('userId'))).toBe(true);
    expect(messages.some(m => m.includes('email'))).toBe(true);
  });

  it('should handle missing inputSchema gracefully', () => {
    const tool = createTool();
    // @ts-expect-error - testing missing inputSchema
    tool.inputSchema = undefined;
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should handle missing properties gracefully', () => {
    const tool = createTool({
      inputSchema: { type: 'object' },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should provide helpful suggestion', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues[0].suggestion).toContain('userId');
  });
});
