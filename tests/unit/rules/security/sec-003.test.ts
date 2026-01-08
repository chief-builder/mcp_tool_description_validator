/**
 * Tests for SEC-003: Number parameters should have minimum/maximum constraints
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-003.js';
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

describe('SEC-003: Number parameters should have minimum/maximum constraints', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-003');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('warning');
  });

  describe('passing cases', () => {
    it('should pass when number has minimum', () => {
      const tool = createTool({
        count: { type: 'number', minimum: 0 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when number has maximum', () => {
      const tool = createTool({
        limit: { type: 'number', maximum: 100 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when number has both minimum and maximum', () => {
      const tool = createTool({
        percentage: { type: 'number', minimum: 0, maximum: 100 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when integer has minimum', () => {
      const tool = createTool({
        age: { type: 'integer', minimum: 0 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-numeric types', () => {
      const tool = createTool({
        name: { type: 'string' },
        active: { type: 'boolean' },
        items: { type: 'array' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail when number lacks both minimum and maximum', () => {
      const tool = createTool({
        value: { type: 'number' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-003');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].path).toBe('inputSchema.properties.value');
    });

    it('should fail when integer lacks constraints', () => {
      const tool = createTool({
        count: { type: 'integer' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for multiple unbounded numbers', () => {
      const tool = createTool({
        x: { type: 'number' },
        y: { type: 'number' },
        bounded: { type: 'number', minimum: 0 },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        value: { type: 'number' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('minimum');
      expect(issues[0].suggestion).toContain('maximum');
    });
  });
});
