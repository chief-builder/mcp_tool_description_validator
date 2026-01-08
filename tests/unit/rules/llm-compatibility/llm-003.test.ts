/**
 * Tests for LLM-003: Tool description should explain WHAT the tool does
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-003.js';
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

describe('LLM-003: Tool description should explain WHAT the tool does', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-003');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass for description starting with action verb', () => {
    const tool = createTool({ description: 'Creates a new user account in the system' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with action verb in middle', () => {
    const tool = createTool({ description: 'This tool retrieves user data from the database' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for various action verbs', () => {
    const verbs = ['creates', 'retrieves', 'updates', 'deletes', 'sends', 'fetches', 'generates', 'validates'];
    for (const verb of verbs) {
      const tool = createTool({ description: `${verb} something useful` });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    }
  });

  it('should fail for description without action verb', () => {
    const tool = createTool({ description: 'User account management utility' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-003');
    expect(issues[0].suggestion).toContain('action verb');
  });

  it('should fail for vague description', () => {
    const tool = createTool({ description: 'A tool for users and accounts' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-003');
  });

  it('should skip empty descriptions (handled by LLM-001)', () => {
    const tool = createTool({ description: '' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should be case-insensitive', () => {
    const tool = createTool({ description: 'CREATES a new user account' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should match whole words only', () => {
    // "screate" contains "create" but is not the word "create"
    const tool = createTool({ description: 'This is screating something unusual' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1); // Should fail because "screating" is not "creating"
  });
});
