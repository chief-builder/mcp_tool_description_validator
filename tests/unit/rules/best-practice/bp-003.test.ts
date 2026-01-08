/**
 * BP-003: Consider adding destructiveHint for data-modifying tools
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-003.js';
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

describe('BP-003: destructiveHint annotation', () => {
  describe('modifying tool names', () => {
    const modifyingNames = [
      'create-user',
      'update-record',
      'delete-file',
      'remove-item',
      'set-config',
      'add-member',
      'insert-row',
      'drop-table',
      'clear-cache',
      'reset-password',
      'modify-settings',
      'change-status',
      'write-file',
      'destroy-session',
      'purge-logs',
      'user-create',
      'record-update',
      'file-delete',
    ];

    it.each(modifyingNames)(
      'should report issue for "%s" without destructiveHint',
      (name) => {
        const tool = createTool({ name });
        const ctx = createContext([tool]);

        const issues = rule.check(tool, ctx);

        expect(issues).toHaveLength(1);
        expect(issues[0].id).toBe('BP-003');
        expect(issues[0].message).toContain(name);
        expect(issues[0].message).toContain('destructiveHint');
      }
    );

    it.each(modifyingNames)(
      'should pass for "%s" with destructiveHint=true',
      (name) => {
        const tool = createTool({
          name,
          annotations: { destructiveHint: true },
        });
        const ctx = createContext([tool]);

        const issues = rule.check(tool, ctx);

        expect(issues).toHaveLength(0);
      }
    );

    it.each(modifyingNames)(
      'should pass for "%s" with destructiveHint=false',
      (name) => {
        const tool = createTool({
          name,
          annotations: { destructiveHint: false },
        });
        const ctx = createContext([tool]);

        const issues = rule.check(tool, ctx);

        expect(issues).toHaveLength(0);
      }
    );
  });

  describe('non-modifying tool names', () => {
    const nonModifyingNames = [
      'get-user',
      'list-items',
      'search-records',
      'fetch-data',
      'read-file',
      'find-matches',
      'query-database',
      'check-status',
    ];

    it.each(nonModifyingNames)(
      'should not report issue for "%s" without destructiveHint',
      (name) => {
        const tool = createTool({ name });
        const ctx = createContext([tool]);

        const issues = rule.check(tool, ctx);

        expect(issues).toHaveLength(0);
      }
    );
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-003');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });
});
