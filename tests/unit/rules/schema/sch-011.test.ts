import { describe, expect, it } from 'vitest';
import rule from '../../../../src/rules/schema/sch-011.js';
import type { RuleContext } from '../../../../src/rules/types.js';
import type { ToolDefinition } from '../../../../src/types/index.js';

function createTool(overrides: Record<string, unknown> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    inputSchema: { type: 'object' },
    source: { type: 'file', location: 'test.json', raw: {} },
    ...overrides,
  } as ToolDefinition;
}

function check(tool: ToolDefinition) {
  const context: RuleContext = { allTools: [tool], ruleConfig: true };
  return rule.check(tool, context);
}

describe('SCH-011: optional tool metadata', () => {
  it('should accept valid finalized metadata', () => {
    expect(
      check(
        createTool({
          title: 'Test Tool',
          annotations: {
            title: 'Legacy Display Title',
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
          _meta: { 'example.com/key': 'value' },
        })
      )
    ).toHaveLength(0);
  });

  it('should reject invalid title and _meta shapes', () => {
    const issues = check(createTool({ title: 42, _meta: [] }));
    expect(issues.map((issue) => issue.path)).toEqual(['title', '_meta']);
    expect(issues.every((issue) => issue.severity === 'error')).toBe(true);
  });

  it('should reject invalid annotation field types', () => {
    const issues = check(
      createTool({
        annotations: {
          title: false,
          readOnlyHint: 'yes',
          destructiveHint: 1,
        },
      })
    );
    expect(issues.map((issue) => issue.path)).toEqual([
      'annotations.title',
      'annotations.readOnlyHint',
      'annotations.destructiveHint',
    ]);
  });

  it('should reject non-object annotations', () => {
    const issues = check(createTool({ annotations: 'untrusted' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('annotations');
  });
});
