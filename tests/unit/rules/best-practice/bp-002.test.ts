/**
 * BP-002: Consider adding readOnlyHint annotation
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-002.js';
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

function createContext(tools: ToolDefinition[] = []): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('BP-002: readOnlyHint annotation', () => {
  it('should report issue when readOnlyHint is missing', () => {
    const tool = createTool();
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-002');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message).toContain('missing readOnlyHint');
  });

  it('should pass when readOnlyHint is true', () => {
    const tool = createTool({
      annotations: {
        readOnlyHint: true,
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass when readOnlyHint is false', () => {
    const tool = createTool({
      annotations: {
        readOnlyHint: false,
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue when annotations exists but readOnlyHint is undefined', () => {
    const tool = createTool({
      annotations: {
        title: 'Test',
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-002');
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-002');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });
});
