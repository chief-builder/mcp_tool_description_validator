/**
 * BP-013: Collection tools should support pagination or filtering
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-013.js';
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

describe('BP-013: pagination/filtering for collection tools', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-013');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should flag a list-named tool with no bounding parameters', () => {
    const tool = createTool({
      name: 'list_users',
      description: 'Lists users in the workspace.',
      inputSchema: {
        type: 'object',
        properties: { workspace: { type: 'string' } },
      },
    });

    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-013');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].suggestion?.toLowerCase()).toContain('limit');
  });

  it('should flag by description phrase even when the name is not a listing verb', () => {
    for (const description of [
      'Returns a list of open tickets.',
      'Returns all records in the database.',
      'Lists all registered webhooks.',
      'Returns every event since server start.',
    ]) {
      const tool = createTool({
        name: 'get_records',
        description,
        inputSchema: {
          type: 'object',
          properties: { table: { type: 'string' } },
        },
      });
      expect(check(tool), description).toHaveLength(1);
    }
  });

  it('should recognize other listing verbs (search, query, find, browse)', () => {
    for (const name of [
      'search_docs',
      'query_events',
      'findUsers',
      'browse_catalog',
    ]) {
      const tool = createTool({ name, description: 'Does a thing.' });
      // No bounding parameter at all -> fires
      expect(check(tool), name).toHaveLength(1);
    }
  });

  it('should pass when a limit parameter exists', () => {
    const tool = createTool({
      name: 'list_users',
      description: 'Lists users in the workspace.',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'integer', default: 50 } },
      },
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should pass for other bounding parameter styles', () => {
    for (const paramName of [
      'page_token',
      'cursor',
      'maxResults',
      'offset',
      'filter',
      'created_after',
      'pageSize',
    ]) {
      const tool = createTool({
        name: 'list_users',
        description: 'Lists users.',
        inputSchema: {
          type: 'object',
          properties: { [paramName]: { type: 'string' } },
        },
      });
      expect(check(tool), paramName).toHaveLength(0);
    }
  });

  it('should pass when the bounding parameter is nested', () => {
    const tool = createTool({
      name: 'list_users',
      description: 'Lists users.',
      inputSchema: {
        type: 'object',
        properties: {
          options: {
            type: 'object',
            properties: { limit: { type: 'integer' } },
          },
        },
      },
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should not flag non-collection tools', () => {
    const tool = createTool({
      name: 'create_user',
      description: 'Creates a single user account.',
      inputSchema: {
        type: 'object',
        properties: { email: { type: 'string' } },
      },
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should not flag a getter with an empty description', () => {
    const tool = createTool({
      name: 'get_user',
      description: '',
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should not crash on a missing description or malformed schema', () => {
    const tool = createTool({
      name: 'list_users',
      description: undefined as unknown as string,
      inputSchema: null as unknown as ToolDefinition['inputSchema'],
    });

    // Listing verb with no parameters at all: fires
    expect(check(tool)).toHaveLength(1);
  });
});
