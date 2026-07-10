/**
 * BP-012: Creation tools returning a handle should document its lifetime
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-012.js';
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

function check(tool: ToolDefinition, allTools: ToolDefinition[]) {
  const ctx: RuleContext = { allTools, ruleConfig: true };
  return rule.check(tool, ctx);
}

/** A creation tool that returns a session_id via outputSchema. */
function creationTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return createTool({
    name: 'create_session',
    description: 'Creates a new session and returns its identifier.',
    outputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string' } },
    },
    ...overrides,
  });
}

/** A sibling tool that requires the session_id handle. */
function consumerTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return createTool({
    name: 'add_item',
    description: 'Adds an item to an existing session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session to add to' },
        item: { type: 'string' },
      },
      required: ['session_id', 'item'],
    },
    ...overrides,
  });
}

describe('BP-012: stateful handle documentation', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-012');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should flag a creation tool whose handle lifetime is undocumented', () => {
    const creator = creationTool();
    const consumer = consumerTool();

    const issues = check(creator, [creator, consumer]);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-012');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message).toContain('session_id');
    expect(issues[0].message.toLowerCase()).toContain('lifetime');
  });

  it('should pass when the description documents expiry', () => {
    const creator = creationTool({
      description:
        'Creates a new session and returns its identifier. Sessions expire after 24 hours of inactivity.',
    });
    const consumer = consumerTool();

    expect(check(creator, [creator, consumer])).toHaveLength(0);
  });

  it('should accept other lifetime vocabulary (ttl, retention, valid for)', () => {
    for (const phrase of [
      'The session has a TTL of one hour.',
      'Retention: session data is kept for 7 days.',
      'The returned handle is valid for 30 minutes.',
    ]) {
      const creator = creationTool({
        description: `Creates a new session and returns its identifier. ${phrase}`,
      });
      const consumer = consumerTool();
      expect(check(creator, [creator, consumer])).toHaveLength(0);
    }
  });

  it('should match a handle mentioned only in the description (no outputSchema)', () => {
    const creator = createTool({
      name: 'open_basket',
      description: 'Opens a shopping basket and returns the basket session ID.',
    });
    const consumer = consumerTool({
      name: 'checkout_basket',
      inputSchema: {
        type: 'object',
        properties: { sessionId: { type: 'string' } },
        required: ['sessionId'],
      },
    });

    const issues = check(creator, [creator, consumer]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('sessionId');
  });

  it('should not flag tools whose name does not start with a creation verb', () => {
    const notCreator = creationTool({ name: 'session_create' });
    const consumer = consumerTool();

    expect(check(notCreator, [notCreator, consumer])).toHaveLength(0);
  });

  it('should not flag when no sibling consumes the handle', () => {
    const creator = creationTool();

    expect(check(creator, [creator])).toHaveLength(0);
  });

  it('should not flag when the sibling parameter is optional', () => {
    const creator = creationTool();
    const consumer = consumerTool({
      inputSchema: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          item: { type: 'string' },
        },
        required: ['item'],
      },
    });

    expect(check(creator, [creator, consumer])).toHaveLength(0);
  });

  it('should not flag when the sibling parameter is not handle-like', () => {
    const creator = createTool({
      name: 'create_report',
      description: 'Creates a report from the given query.',
      outputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
      },
    });
    const consumer = createTool({
      name: 'run_search',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    });

    expect(check(creator, [creator, consumer])).toHaveLength(0);
  });

  it('should not flag when the creating tool does not produce the handle name', () => {
    const creator = createTool({
      name: 'create_report',
      description: 'Creates a PDF report.',
    });
    const consumer = consumerTool();

    expect(check(creator, [creator, consumer])).toHaveLength(0);
  });

  it('should fire once even when multiple siblings consume the handle', () => {
    const creator = creationTool();
    const consumerA = consumerTool({ name: 'add_item' });
    const consumerB = consumerTool({ name: 'remove_item' });

    const issues = check(creator, [creator, consumerA, consumerB]);
    expect(issues).toHaveLength(1);
  });

  it('should tolerate malformed sibling schemas', () => {
    const creator = creationTool();
    const badSibling = createTool({
      name: 'broken-tool',
      inputSchema: null as unknown as ToolDefinition['inputSchema'],
    });

    expect(check(creator, [creator, badSibling])).toHaveLength(0);
  });
});
