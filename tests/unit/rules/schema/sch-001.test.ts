import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-001.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-001: Tool must have a name field', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-001');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass when tool has a valid name', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should fail when tool has empty name', () => {
    const tool: ToolDefinition = {
      name: '',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-001');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].tool).toBe('(unnamed)');
  });

  it('should fail when tool has whitespace-only name', () => {
    const tool: ToolDefinition = {
      name: '   ',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-001');
  });

  it('should include path and suggestion in issue', () => {
    const tool: ToolDefinition = {
      name: '',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].path).toBe('name');
    expect(issues[0].suggestion).toBeDefined();
    expect(issues[0].documentation).toBeDefined();
  });
});
