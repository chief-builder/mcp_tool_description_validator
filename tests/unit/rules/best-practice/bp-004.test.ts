/**
 * BP-004: Consider adding idempotentHint annotation
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-004.js';
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

describe('BP-004: idempotentHint annotation', () => {
  it('should report issue when idempotentHint is missing', () => {
    const tool = createTool();
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-004');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message).toContain('missing idempotentHint');
  });

  it('should pass when idempotentHint is true', () => {
    const tool = createTool({
      annotations: {
        idempotentHint: true,
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass when idempotentHint is false', () => {
    const tool = createTool({
      annotations: {
        idempotentHint: false,
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue when annotations exists but idempotentHint is undefined', () => {
    const tool = createTool({
      annotations: {
        title: 'Test',
        readOnlyHint: true,
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-004');
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-004');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });
});
