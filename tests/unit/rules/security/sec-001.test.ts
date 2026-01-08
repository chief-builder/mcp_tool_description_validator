/**
 * Tests for SEC-001: String parameters must have maxLength constraint
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-001.js';
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

describe('SEC-001: String parameters must have maxLength constraint', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-001');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('error');
  });

  describe('passing cases', () => {
    it('should pass when string has maxLength', () => {
      const tool = createTool({
        userId: { type: 'string', maxLength: 100 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-string types', () => {
      const tool = createTool({
        count: { type: 'number' },
        flag: { type: 'boolean' },
        items: { type: 'array' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when no properties defined', () => {
      const tool = createTool({});
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for string with maxLength of 0', () => {
      const tool = createTool({
        emptyOnly: { type: 'string', maxLength: 0 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail when string lacks maxLength', () => {
      const tool = createTool({
        userId: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-001');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].tool).toBe('test-tool');
      expect(issues[0].path).toBe('inputSchema.properties.userId');
    });

    it('should fail for multiple string parameters without maxLength', () => {
      const tool = createTool({
        name: { type: 'string' },
        email: { type: 'string' },
        bio: { type: 'string', maxLength: 500 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(2);
      expect(issues.map((i) => i.path)).toContain('inputSchema.properties.name');
      expect(issues.map((i) => i.path)).toContain('inputSchema.properties.email');
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        query: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('maxLength');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined inputSchema gracefully', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: {},
        source: { type: 'file', location: 'test.json', raw: {} },
      };
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should handle undefined properties gracefully', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: { type: 'object' },
        source: { type: 'file', location: 'test.json', raw: {} },
      };
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });
});
