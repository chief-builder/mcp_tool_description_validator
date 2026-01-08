/**
 * Tests for LLM-005: Tool description should include example usage
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-005.js';
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

describe('LLM-005: Tool description should include example usage', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-005');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should pass for description with "example" keyword', () => {
    const tool = createTool({
      description: 'Creates users. Example: create-user name="John"',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with "e.g." phrase', () => {
    const tool = createTool({
      description: 'Fetches user data (e.g. name, email, phone).',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with "for instance" phrase', () => {
    const tool = createTool({
      description: 'Queries the database. For instance, you can filter by date.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with "such as" phrase', () => {
    const tool = createTool({
      description: 'Supports multiple formats such as JSON, XML, and CSV.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with code block', () => {
    const tool = createTool({
      description: 'Executes code. ```const result = await tool.run()```',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with quoted example', () => {
    const tool = createTool({
      description: 'Searches users by name. Try "search-user query=john"',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with inline code pattern', () => {
    const tool = createTool({
      description: 'Sets configuration values like `timeout=30`',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for description without examples', () => {
    const tool = createTool({
      description: 'Creates a new user account in the system.',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-005');
    expect(issues[0].severity).toBe('suggestion');
  });

  it('should skip empty descriptions (handled by LLM-001)', () => {
    const tool = createTool({ description: '' });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should pass for description with key=value pattern', () => {
    const tool = createTool({
      description: 'Configure the tool with options name="value"',
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });
});
