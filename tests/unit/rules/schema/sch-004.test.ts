import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-004.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-004: inputSchema must be valid JSON Schema', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-004');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass for valid JSON Schema', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          count: { type: 'integer', minimum: 0 },
        },
        required: ['userId'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should pass for empty object schema', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should pass for schema with format', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          url: { type: 'string', format: 'uri' },
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should fail for invalid JSON Schema type', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'invalid-type' }, // Invalid type
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-004');
    expect(issues[0].severity).toBe('error');
  });

  it('should skip when inputSchema is missing (SCH-003 handles this)', () => {
    const tool = {
      name: 'test-tool',
      description: 'A test tool',
      source: mockSource,
    } as unknown as ToolDefinition;

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should include error details in message', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'not-a-real-type' },
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].message).toContain('inputSchema is not valid JSON Schema');
    expect(issues[0].path).toBe('inputSchema');
    expect(issues[0].suggestion).toBeDefined();
  });
});
