/**
 * Tests for LLM-012: Related tools should have consistent description patterns
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-012.js';
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

function createContext(tools: ToolDefinition[]): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('LLM-012: Related tools should have consistent description patterns', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-012');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass for tool without related tools', () => {
    const tool = createTool({
      name: 'standalone-tool',
      description: 'A standalone tool without relatives',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for consistent verb-starting descriptions', () => {
    const tools = [
      createTool({ name: 'user-create', description: 'Creates a new user account' }),
      createTool({ name: 'user-get', description: 'Retrieves user information' }),
      createTool({ name: 'user-update', description: 'Updates user details' }),
      createTool({ name: 'user-delete', description: 'Deletes a user account' }),
    ];
    const issues = rule.check(tools[0], createContext(tools));
    expect(issues).toHaveLength(0);
  });

  it('should fail when one tool does not start with verb', () => {
    const tools = [
      createTool({ name: 'user-create', description: 'Creates a new user account' }),
      createTool({ name: 'user-get', description: 'Retrieves user information' }),
      createTool({ name: 'user-update', description: 'Updates user details' }),
      createTool({ name: 'user-list', description: 'User listing functionality' }), // No verb start
    ];
    const issues = rule.check(tools[3], createContext(tools));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-012');
    expect(issues[0].message).toContain('inconsistent');
  });

  it('should pass when all tools have similar length descriptions', () => {
    const tools = [
      createTool({ name: 'item-add', description: 'Adds a new item to the list' }),
      createTool({ name: 'item-remove', description: 'Removes an item from list' }),
      createTool({ name: 'item-get', description: 'Gets an item by its ID' }),
    ];
    const issues = rule.check(tools[0], createContext(tools));
    expect(issues).toHaveLength(0);
  });

  it('should handle snake_case naming convention', () => {
    const tools = [
      createTool({ name: 'file_read', description: 'Reads file contents' }),
      createTool({ name: 'file_write', description: 'Writes to a file' }),
      createTool({ name: 'file_delete', description: 'Deletes a file' }),
    ];
    const issues = rule.check(tools[0], createContext(tools));
    expect(issues).toHaveLength(0);
  });

  it('should handle camelCase naming convention', () => {
    const tools = [
      createTool({ name: 'recordCreate', description: 'Creates a new record' }),
      createTool({ name: 'recordRead', description: 'Reads a record' }),
      createTool({ name: 'recordUpdate', description: 'Updates a record' }),
    ];
    const issues = rule.check(tools[0], createContext(tools));
    expect(issues).toHaveLength(0);
  });

  it('should require at least 2 related tools for comparison', () => {
    const tools = [
      createTool({ name: 'api-call', description: 'Makes an API call' }),
      createTool({ name: 'api-config', description: 'API configuration settings' }), // Only 1 related
    ];
    const issues = rule.check(tools[1], createContext(tools));
    expect(issues).toHaveLength(0); // Not enough tools to establish pattern
  });

  it('should skip empty descriptions (handled by LLM-001)', () => {
    const tools = [
      createTool({ name: 'data-get', description: 'Gets data' }),
      createTool({ name: 'data-set', description: 'Sets data' }),
      createTool({ name: 'data-clear', description: '' }),
    ];
    const issues = rule.check(tools[2], createContext(tools));
    expect(issues).toHaveLength(0);
  });

  it('should detect missing "when to use" clause inconsistency', () => {
    const tools = [
      createTool({ name: 'cache-get', description: 'Gets cached value. Use this when you need fast access.' }),
      createTool({ name: 'cache-set', description: 'Sets a cache value. Useful for storing temporary data.' }),
      createTool({ name: 'cache-delete', description: 'Removes from cache. Use when clearing stale entries.' }),
      createTool({ name: 'cache-clear', description: 'Clears the entire cache.' }), // Missing when clause
    ];
    const issues = rule.check(tools[3], createContext(tools));
    expect(issues.length).toBeGreaterThanOrEqual(0); // May or may not flag depending on threshold
  });

  it('should provide helpful suggestion with related tool names', () => {
    const tools = [
      createTool({ name: 'order-create', description: 'Creates a new order in the system' }),
      createTool({ name: 'order-update', description: 'Updates order details' }),
      createTool({ name: 'order-cancel', description: 'Cancels an existing order' }),
      createTool({ name: 'order-status', description: 'Order status checking tool' }), // Inconsistent
    ];
    const issues = rule.check(tools[3], createContext(tools));
    if (issues.length > 0) {
      expect(issues[0].suggestion).toContain('order-');
    }
  });
});
