/**
 * Tests for NAM-007: Tool names must be unique within a server
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-007.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const createTool = (name: string): ToolDefinition => ({
  name,
  description: 'Test tool description',
  inputSchema: { type: 'object', properties: {} },
  source: { type: 'file', location: 'test.json', raw: {} },
});

const createContext = (allTools: ToolDefinition[]): RuleContext => ({
  allTools,
  ruleConfig: true,
});

/** Run the rule against every tool in the server, keyed by index. */
function checkAll(tools: ToolDefinition[]) {
  const ctx = createContext(tools);
  return tools.map((tool) => rule.check(tool, ctx));
}

describe('NAM-007: Tool names must be unique within a server', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-007');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass when all names are unique', () => {
    const results = checkAll([
      createTool('read_file'),
      createTool('write_file'),
      createTool('list_directory'),
    ]);
    expect(results.flat()).toHaveLength(0);
  });

  it('should report an error on the 2nd+ occurrence of a duplicate name', () => {
    const results = checkAll([
      createTool('read_file'),
      createTool('read_file'),
    ]);

    // First occurrence is not reported
    expect(results[0]).toHaveLength(0);

    // Second occurrence is an error
    expect(results[1]).toHaveLength(1);
    expect(results[1][0].id).toBe('NAM-007');
    expect(results[1][0].severity).toBe('error');
    expect(results[1][0].message).toContain('read_file');
    expect(results[1][0].path).toBe('name');
  });

  it('should report every occurrence after the first for triplicates', () => {
    const results = checkAll([
      createTool('dup'),
      createTool('dup'),
      createTool('dup'),
    ]);

    expect(results[0]).toHaveLength(0);
    expect(results[1]).toHaveLength(1);
    expect(results[2]).toHaveLength(1);
  });

  it('should warn (not error) when two names differ only by case', () => {
    const results = checkAll([createTool('getUser'), createTool('getuser')]);

    expect(results[0]).toHaveLength(0);
    expect(results[1]).toHaveLength(1);
    expect(results[1][0].severity).toBe('warning');
    expect(results[1][0].message).toContain('getUser');
  });

  it('should not treat case-different names as exact duplicates', () => {
    const results = checkAll([createTool('getUser'), createTool('getuser')]);
    const errors = results.flat().filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('should emit both error and case-warning when applicable', () => {
    const results = checkAll([
      createTool('getUser'),
      createTool('getUser'),
      createTool('getuser'),
    ]);

    expect(results[1]).toHaveLength(1);
    expect(results[1][0].severity).toBe('error');

    expect(results[2]).toHaveLength(1);
    expect(results[2][0].severity).toBe('warning');
  });

  it('should skip empty names (handled by SCH-001)', () => {
    const results = checkAll([createTool(''), createTool('')]);
    expect(results.flat()).toHaveLength(0);
  });
});
