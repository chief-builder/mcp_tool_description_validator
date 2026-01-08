/**
 * Tests for LLM-001: Tool description must be non-empty
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-001.js';
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

describe('LLM-001: Tool description must be non-empty', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-001');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass for tool with valid description', () => {
    const tool = createTool({ description: 'Creates a new user account' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for tool with empty description', () => {
    const tool = createTool({ description: '' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-001');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].tool).toBe('test-tool');
  });

  it('should fail for tool with whitespace-only description', () => {
    const tool = createTool({ description: '   \t\n  ' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-001');
  });

  it('should fail for tool with undefined description', () => {
    const tool = createTool();
    // @ts-expect-error - testing undefined description
    tool.description = undefined;
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-001');
  });

  it('should provide helpful suggestion', () => {
    const tool = createTool({ description: '' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues[0].suggestion).toContain('Add a clear description');
  });

  it('should include path in issue', () => {
    const tool = createTool({ description: '' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues[0].path).toBe('description');
  });
});
