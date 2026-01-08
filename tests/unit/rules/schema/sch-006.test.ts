import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-006.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-006: inputSchema.properties should be defined', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-006');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass when properties has entries', () => {
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
    expect(issues).toHaveLength(0);
  });

  it('should warn when properties is missing', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-006');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('missing');
  });

  it('should warn when properties is empty object', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-006');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('empty');
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
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].path).toBe('inputSchema.properties');
    expect(issues[0].suggestion).toBeDefined();
    expect(issues[0].documentation).toBeDefined();
  });
});
