import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-002.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-002: Tool must have a description field', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-002');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass when tool has a valid description', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A comprehensive description of what this tool does',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should fail when tool has empty description', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: '',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-002');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].tool).toBe('test-tool');
  });

  it('should fail when tool has whitespace-only description', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: '   \t\n  ',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-002');
  });

  it('should include path and suggestion in issue', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: '',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].path).toBe('description');
    expect(issues[0].suggestion).toBeDefined();
    expect(issues[0].documentation).toBeDefined();
  });
});
