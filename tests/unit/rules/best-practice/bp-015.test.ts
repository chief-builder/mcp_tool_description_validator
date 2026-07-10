/**
 * BP-015: Overlapping or duplicative tools confuse agents
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-015.js';
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

describe('BP-015: overlapping tool descriptions', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-015');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  it('should flag the later of two tools with near-identical descriptions', () => {
    const earlier = createTool({
      name: 'search_tasks',
      description:
        'Search for tasks in the project by keyword and return matching results.',
    });
    const later = createTool({
      name: 'find_tasks',
      description:
        'Search for tasks in the project by keyword and return matched results.',
    });
    const allTools = [earlier, later];

    const laterIssues = check(later, allTools);
    expect(laterIssues).toHaveLength(1);
    expect(laterIssues[0].id).toBe('BP-015');
    expect(laterIssues[0].severity).toBe('suggestion');
    expect(laterIssues[0].message).toContain('search_tasks');

    // The earlier tool of the pair gets no finding
    expect(check(earlier, allTools)).toHaveLength(0);
  });

  it('should flag when one description strictly contains the other (>= 8 tokens)', () => {
    const earlier = createTool({
      name: 'delete_file',
      description:
        'Delete the specified file from the remote storage bucket permanently.',
    });
    const later = createTool({
      name: 'remove_file',
      description:
        'Delete the specified file from the remote storage bucket permanently after creating a local backup copy first.',
    });
    const allTools = [earlier, later];

    const issues = check(later, allTools);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('delete_file');
  });

  it('should stay silent for genuinely different descriptions', () => {
    const a = createTool({
      name: 'send_email',
      description: 'Send an email message to the given recipient address.',
    });
    const b = createTool({
      name: 'list_events',
      description: 'List calendar events scheduled for the current week.',
    });
    const allTools = [a, b];

    expect(check(a, allTools)).toHaveLength(0);
    expect(check(b, allTools)).toHaveLength(0);
  });

  it('should stay silent for identical but trivially short descriptions', () => {
    const a = createTool({ name: 'tool_a', description: 'A test tool' });
    const b = createTool({ name: 'tool_b', description: 'A test tool' });
    const allTools = [a, b];

    expect(check(b, allTools)).toHaveLength(0);
  });

  it('should stay silent when short containment lacks enough tokens', () => {
    const a = createTool({
      name: 'get_user',
      description: 'Get a user profile record.',
    });
    const b = createTool({
      name: 'get_user_details',
      description: 'Get a user profile record with account settings.',
    });
    const allTools = [a, b];

    expect(check(b, allTools)).toHaveLength(0);
  });

  it('should stay silent for empty or missing descriptions', () => {
    const a = createTool({ name: 'tool_a', description: '' });
    const b = createTool({ name: 'tool_b', description: '' });
    const c = createTool({
      name: 'tool_c',
      description: undefined as unknown as string,
    });
    const allTools = [a, b, c];

    for (const tool of allTools) {
      expect(check(tool, allTools)).toHaveLength(0);
    }
  });

  it('should stay silent for a single tool', () => {
    const tool = createTool({
      name: 'search_tasks',
      description:
        'Search for tasks in the project by keyword and return matching results.',
    });

    expect(check(tool, [tool])).toHaveLength(0);
  });

  it('should skip exact duplicate names (covered by NAM-007)', () => {
    const a = createTool({
      name: 'search_tasks',
      description:
        'Search for tasks in the project by keyword and return matching results.',
    });
    const b = createTool({
      name: 'search_tasks',
      description:
        'Search for tasks in the project by keyword and return matching results.',
    });
    const allTools = [a, b];

    expect(check(b, allTools)).toHaveLength(0);
  });

  it('should emit at most one finding per tool even with multiple overlaps', () => {
    const description =
      'Search for tasks in the project by keyword and return matching results.';
    const a = createTool({ name: 'search_tasks_a', description });
    const b = createTool({ name: 'search_tasks_b', description });
    const c = createTool({ name: 'search_tasks_c', description });
    const allTools = [a, b, c];

    const issues = check(c, allTools);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('search_tasks_a');
  });
});
