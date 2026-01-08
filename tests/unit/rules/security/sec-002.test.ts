/**
 * Tests for SEC-002: Array parameters must have maxItems constraint
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-002.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const createTool = (properties: Record<string, unknown>): ToolDefinition => ({
  name: 'test-tool',
  description: 'Test tool description',
  inputSchema: { type: 'object', properties },
  source: { type: 'file', location: 'test.json', raw: {} },
});

const createContext = (): RuleContext => ({
  allTools: [],
  ruleConfig: true,
});

describe('SEC-002: Array parameters must have maxItems constraint', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-002');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('error');
  });

  describe('passing cases', () => {
    it('should pass when array has maxItems', () => {
      const tool = createTool({
        ids: { type: 'array', maxItems: 100, items: { type: 'string' } },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-array types', () => {
      const tool = createTool({
        name: { type: 'string' },
        count: { type: 'number' },
        active: { type: 'boolean' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when no properties defined', () => {
      const tool = createTool({});
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for array with maxItems of 0', () => {
      const tool = createTool({
        emptyArray: { type: 'array', maxItems: 0 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail when array lacks maxItems', () => {
      const tool = createTool({
        userIds: { type: 'array', items: { type: 'string' } },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-002');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].tool).toBe('test-tool');
      expect(issues[0].path).toBe('inputSchema.properties.userIds');
    });

    it('should fail for multiple array parameters without maxItems', () => {
      const tool = createTool({
        ids: { type: 'array' },
        tags: { type: 'array' },
        limited: { type: 'array', maxItems: 10 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        items: { type: 'array' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('maxItems');
    });
  });
});
