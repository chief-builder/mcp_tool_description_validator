/**
 * Tests for SEC-009: Object parameters with additionalProperties: true need justification
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-009.js';
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

describe('SEC-009: Object parameters with additionalProperties: true need justification', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-009');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('warning');
  });

  describe('passing cases', () => {
    it('should pass when object has additionalProperties: false', () => {
      const tool = createTool({
        config: {
          type: 'object',
          properties: { name: { type: 'string' } },
          additionalProperties: false,
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when object has additionalProperties as schema', () => {
      const tool = createTool({
        metadata: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-object types', () => {
      const tool = createTool({
        name: { type: 'string' },
        count: { type: 'number' },
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
  });

  describe('failing cases', () => {
    it('should fail when object has additionalProperties: true', () => {
      const tool = createTool({
        data: {
          type: 'object',
          additionalProperties: true,
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-009');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].path).toBe('inputSchema.properties.data');
    });

    it('should fail when object has no additionalProperties (defaults to true)', () => {
      const tool = createTool({
        options: {
          type: 'object',
          properties: { enabled: { type: 'boolean' } },
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for multiple objects allowing additional properties', () => {
      const tool = createTool({
        config: { type: 'object' },
        metadata: { type: 'object', additionalProperties: true },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        data: { type: 'object' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('additionalProperties');
      expect(issues[0].suggestion).toContain('false');
    });
  });

  describe('edge cases', () => {
    it('should handle empty object type', () => {
      const tool = createTool({
        empty: { type: 'object' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should not flag object with additionalProperties as object schema', () => {
      const tool = createTool({
        headers: {
          type: 'object',
          additionalProperties: { type: 'string', maxLength: 100 },
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });
});
