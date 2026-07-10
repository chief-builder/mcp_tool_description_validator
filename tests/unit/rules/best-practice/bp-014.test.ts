/**
 * BP-014: Large-output tools should offer response-format control
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-014.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool',
    inputSchema: { type: 'object', properties: {} },
    source: { type: 'file', location: '/test.json', raw: {} },
    ...overrides,
  };
}

function check(tool: ToolDefinition) {
  const ctx: RuleContext = { allTools: [tool], ruleConfig: true };
  return rule.check(tool, ctx);
}

describe('BP-014: response-format control for large-output tools', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-014');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should flag a large-output tool with no format control', () => {
    const tool = createTool({
      name: 'get_commit_history',
      description: 'Returns the full commit history of the repository.',
      inputSchema: {
        type: 'object',
        properties: { repo: { type: 'string' } },
      },
    });

    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-014');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].suggestion).toContain('response_format');
  });

  it('should recognize other large-output vocabulary', () => {
    for (const description of [
      'Dump the entire database schema.',
      'Fetches the complete audit logs.',
      'Reads the contents of the file.',
      'Returns detailed diagnostics for everything on the host.',
    ]) {
      const tool = createTool({ name: 'do_thing', description });
      expect(check(tool), description).toHaveLength(1);
    }
  });

  it('should pass when a response_format parameter exists', () => {
    const tool = createTool({
      name: 'get_commit_history',
      description: 'Returns the full commit history of the repository.',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          response_format: { type: 'string', enum: ['concise', 'detailed'] },
        },
      },
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should pass for other format-control parameter styles', () => {
    for (const paramName of [
      'verbosity',
      'detail_level',
      'fields',
      'include_metadata',
      'outputFormat',
    ]) {
      const tool = createTool({
        name: 'get_logs',
        description: 'Fetches the complete logs.',
        inputSchema: {
          type: 'object',
          properties: { [paramName]: { type: 'string' } },
        },
      });
      expect(check(tool), paramName).toHaveLength(0);
    }
  });

  it('should not flag tools without large-output vocabulary', () => {
    const tool = createTool({
      name: 'get_user',
      description: 'Gets a user profile by ID.',
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should match whole words only (helpful does not contain full)', () => {
    const tool = createTool({
      name: 'get_user',
      description: 'A helpful tool for looking up a user.',
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should not flag a tool with an empty or missing description', () => {
    expect(check(createTool({ description: '' }))).toHaveLength(0);
    expect(
      check(createTool({ description: undefined as unknown as string }))
    ).toHaveLength(0);
  });

  it('should tolerate a malformed inputSchema', () => {
    const tool = createTool({
      name: 'get_logs',
      description: 'Fetches the complete logs.',
      inputSchema: null as unknown as ToolDefinition['inputSchema'],
    });

    expect(check(tool)).toHaveLength(1);
  });
});
