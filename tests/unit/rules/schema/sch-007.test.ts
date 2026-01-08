import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-007.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-007: Required parameters should be listed in inputSchema.required', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-007');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass when required array is present', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['userId'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should pass when required is an empty array (explicitly all optional)', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string' },
        },
        required: [],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should warn when properties exist but required is missing', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-007');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('no "required" array');
  });

  it('should warn when required is not an array', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: 'userId', // Should be an array
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-007');
    expect(issues[0].message).toContain('not an array');
  });

  it('should not warn when properties is empty', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      source: mockSource,
    };

    // No warning because there are no properties to require
    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should not warn when properties is missing', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    // No warning because there are no properties to require
    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
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

  it('should include path and suggestion in issue', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].path).toBe('inputSchema.required');
    expect(issues[0].suggestion).toBeDefined();
    expect(issues[0].documentation).toBeDefined();
  });
});
