/**
 * Tests for SCH-009: $ref must not resolve to a network URI
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-009.js';
import type {
  ToolDefinition,
  ToolSource,
} from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createTool(inputSchema: Record<string, unknown>): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool',
    inputSchema: inputSchema as ToolDefinition['inputSchema'],
    source: mockSource,
  };
}

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-009: $ref must not resolve to a network URI', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SCH-009');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
    expect(rule.documentation).toBe(
      'https://modelcontextprotocol.io/specification/2026-07-28/basic/index#$ref-resolution'
    );
  });

  it('should pass for local $ref into $defs', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        user: { $ref: '#/$defs/user' },
      },
      $defs: {
        user: { type: 'object', properties: { id: { type: 'string' } } },
      },
    });

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should pass for a schema without any $ref', () => {
    const tool = createTool({
      type: 'object',
      properties: { name: { type: 'string' } },
    });

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should flag a top-level https $ref', () => {
    const tool = createTool({
      $ref: 'https://example.com/schemas/user.json',
    });

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-009');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain(
      'https://example.com/schemas/user.json'
    );
    expect(issues[0].path).toBe('inputSchema.$ref');
    expect(issues[0].suggestion).toContain('$defs');
  });

  it('should flag an http $ref', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        user: { $ref: 'http://example.com/user.json' },
      },
    });

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
  });

  it('should flag a protocol-relative $ref', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        user: { $ref: '//example.com/user.json' },
      },
    });

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
  });

  it('should flag a network $ref nested inside properties with the correct path', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        account: {
          type: 'object',
          properties: {
            owner: { $ref: 'https://example.com/schemas/person.json' },
          },
        },
      },
    });

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe(
      'inputSchema.properties.account.properties.owner.$ref'
    );
  });

  it('should skip when inputSchema is missing (SCH-003 handles this)', () => {
    const tool = {
      name: 'test-tool',
      description: 'A test tool',
      source: mockSource,
    } as unknown as ToolDefinition;

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });
});
