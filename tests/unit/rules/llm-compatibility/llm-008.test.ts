/**
 * Tests for LLM-008: Avoid ambiguous terms without context
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-008.js';
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

describe('LLM-008: Avoid ambiguous terms without context', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-008');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass for parameter with specific name', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The unique identifier for the user',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for ambiguous name with context in description', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: 'The user profile data containing name and email',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for ambiguous parameter name without context', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: 'Pass this along',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1); // One for name (description doesn't have "data")
    expect(issues[0].id).toBe('LLM-008');
    expect(issues[0].message).toContain('data');
  });

  it('should fail for "value" parameter without context', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          value: {
            type: 'string',
            description: 'Use this',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should fail for "input" parameter without context', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Use this',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should pass for contextual terms in description', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          info: {
            type: 'object',
            description: 'User information containing name, email, and phone',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should handle missing inputSchema gracefully', () => {
    const tool = createTool();
    // @ts-expect-error - testing missing inputSchema
    tool.inputSchema = undefined;
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should provide helpful suggestion', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          stuff: {
            type: 'object',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues[0].suggestion).toBeDefined();
  });
});
