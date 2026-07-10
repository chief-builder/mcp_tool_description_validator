/**
 * NAM-008: Large tool sets should group related tools under common prefixes
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-008.js';
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

function tools(names: string[]): ToolDefinition[] {
  return names.map((name) => createTool({ name }));
}

function check(tool: ToolDefinition, allTools: ToolDefinition[]) {
  const ctx: RuleContext = { allTools, ruleConfig: true };
  return rule.check(tool, ctx);
}

/** 10 names with no shared first or last tokens. */
const UNGROUPED_NAMES = [
  'alpha_one',
  'beta_two',
  'gamma_three',
  'delta_four',
  'epsilon_five',
  'zeta_six',
  'eta_seven',
  'theta_eight',
  'iota_nine',
  'kappa_ten',
];

describe('NAM-008: prefix-based namespacing for large tool sets', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('NAM-008');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should suggest namespacing for 10+ tools with no grouping structure', () => {
    const allTools = tools(UNGROUPED_NAMES);

    const issues = check(allTools[0], allTools);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('NAM-008');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message.toLowerCase()).toContain('prefix');
  });

  it('should emit the finding only on the first tool (one per run)', () => {
    const allTools = tools(UNGROUPED_NAMES);

    for (const tool of allTools.slice(1)) {
      expect(check(tool, allTools)).toHaveLength(0);
    }
  });

  it('should stay silent for fewer than 10 tools', () => {
    const allTools = tools(UNGROUPED_NAMES.slice(0, 5));

    expect(check(allTools[0], allTools)).toHaveLength(0);
  });

  it('should stay silent for a single tool', () => {
    const allTools = tools(['solo_tool']);

    expect(check(allTools[0], allTools)).toHaveLength(0);
  });

  it('should stay silent when tools group by shared prefix', () => {
    // 4 of 10 tools share the "asana" first token (40% >= 30%)
    const allTools = tools([
      'asana_projects_search',
      'asana_tasks_create',
      'asana_tasks_update',
      'asana_users_list',
      'beta_two',
      'gamma_three',
      'delta_four',
      'epsilon_five',
      'zeta_six',
      'eta_seven',
    ]);

    expect(check(allTools[0], allTools)).toHaveLength(0);
  });

  it('should stay silent when tools group by shared last token (verb families)', () => {
    // 3 of 10 tools share the "file" last token (30% >= 30%)
    const allTools = tools([
      'read_file',
      'write_file',
      'delete_file',
      'beta_two',
      'gamma_three',
      'delta_four',
      'epsilon_five',
      'zeta_six',
      'eta_seven',
      'theta_eight',
    ]);

    expect(check(allTools[0], allTools)).toHaveLength(0);
  });

  it('should recognize camelCase grouping the same as snake_case', () => {
    const allTools = tools([
      'asanaProjectsSearch',
      'asanaTasksCreate',
      'asanaTasksUpdate',
      'asanaUsersList',
      'betaTwo',
      'gammaThree',
      'deltaFour',
      'epsilonFive',
      'zetaSix',
      'etaSeven',
    ]);

    expect(check(allTools[0], allTools)).toHaveLength(0);
  });

  it('should tolerate empty and malformed tool names', () => {
    const allTools = [
      ...tools(UNGROUPED_NAMES.slice(0, 8)),
      createTool({ name: '' }),
      createTool({ name: undefined as unknown as string }),
    ];

    // 10 tools, no grouping — fires once on the first, without crashing
    expect(check(allTools[0], allTools)).toHaveLength(1);
  });
});
