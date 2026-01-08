/**
 * Tests for LLM-007: Parameter descriptions should be 10-200 characters
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-007.js';
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

describe('LLM-007: Parameter descriptions should be 10-200 characters', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-007');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass for description within valid range', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The unique identifier of the user account',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description exactly at minimum (10 chars)', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: '1234567890', // exactly 10 chars
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description exactly at maximum (200 chars)', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'a'.repeat(200),
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for description too short', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User ID', // 7 chars
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-007');
    expect(issues[0].message).toContain('too short');
    expect(issues[0].message).toContain('userId');
  });

  it('should fail for description too long', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'a'.repeat(201),
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-007');
    expect(issues[0].message).toContain('too long');
  });

  it('should skip parameters without descriptions (handled by LLM-006)', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should report multiple parameters with length issues', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'Short' },
          email: { type: 'string', description: 'a'.repeat(250) },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(2);
  });

  it('should trim whitespace when checking length', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: '  Short  ',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('5 characters');
  });
});
