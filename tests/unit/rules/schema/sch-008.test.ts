import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-008.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-008: Parameters in required must exist in properties', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-008');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass when all required params exist in properties', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['userId', 'action'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should pass when required is empty', () => {
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

  it('should fail when required param does not exist in properties', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId', 'nonExistent'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-008');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('nonExistent');
    expect(issues[0].message).toContain('not defined in properties');
  });

  it('should fail for multiple missing required params', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
        required: ['param1', 'param2', 'param3'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(3);
    expect(issues.map(i => i.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('param1'),
        expect.stringContaining('param2'),
        expect.stringContaining('param3'),
      ])
    );
  });

  it('should fail when required contains non-string values', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId', 123, null],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(2); // One for 123, one for null
    expect(issues[0].id).toBe('SCH-008');
    expect(issues[0].message).toContain('non-string');
  });

  it('should fail when properties is missing but required has entries', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        required: ['userId'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-008');
    expect(issues[0].message).toContain('userId');
  });

  it('should skip when required is not an array (SCH-007 handles this)', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: 'userId',
      },
      source: mockSource,
    };

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

  it('should include suggestion in issue', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
        required: ['missing'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].suggestion).toContain('missing');
    expect(issues[0].documentation).toBeDefined();
  });
});
