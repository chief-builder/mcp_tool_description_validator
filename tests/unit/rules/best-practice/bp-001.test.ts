/**
 * BP-001: Consider adding a title for display purposes
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-001.js';
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

describe('BP-001: title for display purposes', () => {
  it('should report issue when both top-level title and annotations.title are missing', () => {
    const tool = createTool();
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-001');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message).toContain('missing a title');
    expect(issues[0].suggestion).toContain('top-level `title`');
  });

  it('should pass when top-level title is present', () => {
    const tool = createTool({ title: 'Test Tool' });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass when annotations.title is present', () => {
    const tool = createTool({
      annotations: {
        title: 'Test Tool',
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass when both titles are present', () => {
    const tool = createTool({
      title: 'Test Tool',
      annotations: { title: 'Test Tool (legacy)' },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue when annotations object exists but has no title', () => {
    const tool = createTool({
      annotations: {
        readOnlyHint: true,
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-001');
  });

  it('should report issue when title is an empty string', () => {
    const tool = createTool({ title: '' });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-001');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });
});
