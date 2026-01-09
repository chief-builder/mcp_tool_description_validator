/**
 * Tests for LLM-013: Tool description should include workflow guidance
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-013.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool description',
    inputSchema: { type: 'object', properties: {} },
    source: { type: 'file', location: 'test.json', raw: {} },
    ...overrides,
  };
}

function createContext(tools: ToolDefinition[] = []): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('LLM-013: Tool description should include workflow guidance', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-013');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('suggestion');
  });

  describe('workflow keywords', () => {
    it('should pass for description with "first"', () => {
      const tool = createTool({
        description: 'Creates a new resource. Call this first before making other changes.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for description with "before"', () => {
      const tool = createTool({
        description: 'Validates the input. Run this before submitting the form.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for description with "after"', () => {
      const tool = createTool({
        description: 'Gets the status. Use after creating a resource to check progress.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for description with "instead"', () => {
      const tool = createTool({
        description: 'Simple search. Use search_advanced instead for complex queries.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for description with "alternatively"', () => {
      const tool = createTool({
        description: 'Gets user by ID. Alternatively, use search_users to find by name.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for description with "prerequisite"', () => {
      const tool = createTool({
        description: 'Submits the order. Prerequisite: user must be authenticated.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for description with "requires"', () => {
      const tool = createTool({
        description: 'Sends a notification. Requires a valid session token.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for description with "then"', () => {
      const tool = createTool({
        description: 'Authenticates the user. Then you can access protected resources.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });
  });

  describe('workflow patterns', () => {
    it('should pass for "use X for" pattern', () => {
      const tool = createTool({
        description: 'Basic file reader. Use read_file_advanced for large files.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for "call X to" pattern', () => {
      const tool = createTool({
        description: 'Gets user info. Call validate_token to ensure authentication.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for "see X for" pattern', () => {
      const tool = createTool({
        description: 'Creates a simple report. See generate_detailed_report for more options.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass for "prefer X" pattern', () => {
      const tool = createTool({
        description: 'Legacy search function. Prefer search_v2 for better performance.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });
  });

  describe('tool name references', () => {
    it('should pass when description mentions another tool name', () => {
      const tool1 = createTool({
        name: 'create_user',
        description: 'Creates a new user in the system.',
      });
      const tool2 = createTool({
        name: 'get_user_status',
        description: 'Gets user status. Works well with create_user to verify creation.',
      });
      const allTools = [tool1, tool2];
      const issues = rule.check(tool2, createContext(allTools));
      expect(issues).toHaveLength(0);
    });

    it('should not count self-reference as workflow guidance', () => {
      const tool = createTool({
        name: 'test_tool',
        description: 'This is test_tool. It does testing.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(1);
    });
  });

  describe('missing workflow guidance', () => {
    it('should fail for description without workflow guidance', () => {
      const tool = createTool({
        description: 'Gets the current user profile.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('LLM-013');
      expect(issues[0].severity).toBe('suggestion');
      expect(issues[0].message).toContain('workflow guidance');
    });

    it('should fail for simple description without context', () => {
      const tool = createTool({
        description: 'Deletes a file from storage.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(1);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        description: 'Lists all users.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues[0].suggestion).toBeDefined();
      expect(issues[0].suggestion).toContain('Call X first');
    });
  });

  describe('edge cases', () => {
    it('should skip empty description', () => {
      const tool = createTool({
        description: '',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should skip whitespace-only description', () => {
      const tool = createTool({
        description: '   ',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should handle undefined description', () => {
      const tool = createTool();
      // @ts-expect-error - testing undefined description
      tool.description = undefined;
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should not match partial keywords (e.g., "afternoon" should not match "after")', () => {
      const tool = createTool({
        description: 'Sends afternoon notifications.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(1); // Should still fail, "afternoon" is not "after"
    });

    it('should match case-insensitively', () => {
      const tool = createTool({
        description: 'CALL THIS FIRST before doing anything else.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });
  });

  describe('real-world examples', () => {
    it('should pass: "Call discover_required_fields first to identify mandatory fields"', () => {
      const tool = createTool({
        description: 'Call discover_required_fields first to identify mandatory fields.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass: "No user filtering; use search_calls_extensive instead"', () => {
      const tool = createTool({
        description: 'Basic search. No user filtering; use search_calls_extensive instead.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });

    it('should pass: "After creating, use get_status to check progress"', () => {
      const tool = createTool({
        description: 'Creates a new task. After creating, use get_status to check progress.',
      });
      const issues = rule.check(tool, createContext([tool]));
      expect(issues).toHaveLength(0);
    });
  });
});
