/**
 * Tests for LLM-002: Tool description should be 20-500 characters
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-002.js';
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

describe('LLM-002: Tool description should be 20-500 characters', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-002');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass for description within valid range', () => {
    const tool = createTool({
      description: 'Creates a new user account in the system with the specified details.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description exactly at minimum (20 chars)', () => {
    const tool = createTool({ description: '12345678901234567890' }); // exactly 20 chars
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description exactly at maximum (500 chars)', () => {
    const tool = createTool({ description: 'a'.repeat(500) });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for description too short', () => {
    const tool = createTool({ description: 'Too short' }); // 9 chars
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-002');
    expect(issues[0].message).toContain('too short');
    expect(issues[0].message).toContain('9 characters');
  });

  it('should fail for description too long', () => {
    const tool = createTool({ description: 'a'.repeat(501) });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-002');
    expect(issues[0].message).toContain('too long');
    expect(issues[0].message).toContain('501 characters');
  });

  it('should skip empty descriptions (handled by LLM-001)', () => {
    const tool = createTool({ description: '' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should skip whitespace-only descriptions (handled by LLM-001)', () => {
    const tool = createTool({ description: '   ' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should trim whitespace when checking length', () => {
    const tool = createTool({ description: '  Too short  ' }); // "Too short" is 9 chars
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('9 characters');
  });
});
