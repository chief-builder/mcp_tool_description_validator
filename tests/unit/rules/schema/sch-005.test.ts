import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-005.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-005: inputSchema.type must be "object"', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-005');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass when inputSchema.type is "object"', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should fail when inputSchema.type is "array"', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'array', items: { type: 'string' } },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-005');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('"array"');
    expect(issues[0].message).toContain('must be "object"');
  });

  it('should fail when inputSchema.type is "string"', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'string' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-005');
    expect(issues[0].message).toContain('"string"');
  });

  it('should fail when inputSchema.type is missing', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { properties: { id: { type: 'string' } } },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-005');
    expect(issues[0].message).toContain('missing');
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
      inputSchema: { type: 'number' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].path).toBe('inputSchema.type');
    expect(issues[0].suggestion).toBeDefined();
    expect(issues[0].documentation).toBeDefined();
  });
});
