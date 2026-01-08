/**
 * Tests for LLM-004: Tool description should explain WHEN to use the tool
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-004.js';
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

describe('LLM-004: Tool description should explain WHEN to use the tool', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-004');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass for description with "when" clause', () => {
    const tool = createTool({
      description: 'Creates a user account. Use this when registering new users.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with "if" clause', () => {
    const tool = createTool({
      description: 'Deletes a user. Use this if you need to remove an account.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with "use this to" phrase', () => {
    const tool = createTool({
      description: 'Use this to create new user accounts in the system.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with "for" clause', () => {
    const tool = createTool({
      description: 'A tool for managing user permissions.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with "useful for" phrase', () => {
    const tool = createTool({
      description: 'Useful for bulk operations on user accounts.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for description without when/context clause', () => {
    const tool = createTool({
      description: 'Creates a new user account in the system.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-004');
    expect(issues[0].suggestion).toContain('when to use');
  });

  it('should skip empty descriptions (handled by LLM-001)', () => {
    const tool = createTool({ description: '' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should be case-insensitive', () => {
    const tool = createTool({
      description: 'WHEN you need to create users, this tool helps.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });
});
