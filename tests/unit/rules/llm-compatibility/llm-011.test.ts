/**
 * Tests for LLM-011: Tool description should mention side effects if any
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-011.js';
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

describe('LLM-011: Tool description should mention side effects if any', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-011');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should pass for read-only tool', () => {
    const tool = createTool({
      name: 'get-user',
      description: 'Retrieves user information from the database',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass when create tool mentions side effect', () => {
    const tool = createTool({
      name: 'create-user',
      description: 'Creates a new user account in the database',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail when create tool does not mention side effect', () => {
    const tool = createTool({
      name: 'create-user',
      description: 'A tool for user management',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-011');
    expect(issues[0].message).toContain('side effects');
  });

  it('should pass when delete tool mentions side effect', () => {
    const tool = createTool({
      name: 'delete-user',
      description: 'Permanently deletes the user account',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail when delete tool does not mention side effect', () => {
    const tool = createTool({
      name: 'delete-user',
      description: 'User account management tool',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
  });

  it('should pass when send tool mentions side effect', () => {
    const tool = createTool({
      name: 'send-email',
      description: 'Sends an email to the specified recipient',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail when send tool does not mention side effect', () => {
    const tool = createTool({
      name: 'send-notification',
      description: 'Notification handling utility',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
  });

  it('should pass when update tool mentions side effect', () => {
    const tool = createTool({
      name: 'update-profile',
      description: 'Updates the user profile with new information',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for destructive hint without warning', () => {
    const tool = createTool({
      name: 'remove-data',
      description: 'Handles data operations',
      annotations: {
        destructiveHint: true,
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.message.includes('destructive'))).toBe(true);
  });

  it('should pass for destructive hint with warning', () => {
    const tool = createTool({
      name: 'purge-records',
      description: 'Warning: Permanently deletes all records. This action cannot be undone.',
      annotations: {
        destructiveHint: true,
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues.filter(i => i.message.includes('destructive'))).toHaveLength(0);
  });

  it('should skip empty descriptions (handled by LLM-001)', () => {
    const tool = createTool({
      name: 'create-user',
      description: '',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should handle snake_case tool names', () => {
    const tool = createTool({
      name: 'create_user',
      description: 'User account tool',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
  });

  it('should handle kebab-case tool names', () => {
    const tool = createTool({
      name: 'create-user',
      description: 'Creates a new user in the system',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });
});
