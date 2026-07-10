/**
 * BP-011: Parameterless tools should set additionalProperties: false
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-011.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(inputSchema: unknown): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool',
    inputSchema: inputSchema as ToolDefinition['inputSchema'],
    source: { type: 'file', location: '/test.json', raw: {} },
  };
}

function check(tool: ToolDefinition) {
  const ctx: RuleContext = { allTools: [tool], ruleConfig: true };
  return rule.check(tool, ctx);
}

describe('BP-011: parameterless tool shape', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-011');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should flag { type: "object" } with no properties', () => {
    const issues = check(createTool({ type: 'object' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-011');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].path).toBe('inputSchema');
    expect(issues[0].suggestion).toContain('additionalProperties');
  });

  it('should flag an empty properties object without additionalProperties: false', () => {
    const issues = check(createTool({ type: 'object', properties: {} }));
    expect(issues).toHaveLength(1);
  });

  it('should flag when additionalProperties is true', () => {
    const issues = check(
      createTool({ type: 'object', properties: {}, additionalProperties: true })
    );
    expect(issues).toHaveLength(1);
  });

  it('should pass the spec-recommended shape', () => {
    const issues = check(
      createTool({ type: 'object', additionalProperties: false })
    );
    expect(issues).toHaveLength(0);
  });

  it('should pass with empty properties and additionalProperties: false', () => {
    const issues = check(
      createTool({ type: 'object', properties: {}, additionalProperties: false })
    );
    expect(issues).toHaveLength(0);
  });

  it('should pass for tools with parameters', () => {
    const issues = check(
      createTool({
        type: 'object',
        properties: { query: { type: 'string' } },
      })
    );
    expect(issues).toHaveLength(0);
  });

  it('should skip non-object schema types', () => {
    expect(check(createTool({ type: 'string' }))).toHaveLength(0);
  });

  it('should skip missing or malformed inputSchema', () => {
    expect(check(createTool(undefined))).toHaveLength(0);
    expect(check(createTool(null))).toHaveLength(0);
    expect(check(createTool('not-a-schema'))).toHaveLength(0);
    expect(check(createTool({ type: 'object', properties: 'bad' }))).toHaveLength(0);
  });
});
