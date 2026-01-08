/**
 * Tests for NAM-006: Parameter names should use consistent casing (camelCase recommended)
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-006.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const createTool = (properties: Record<string, unknown>): ToolDefinition => ({
  name: 'test-tool',
  description: 'Test tool description',
  inputSchema: {
    type: 'object',
    properties,
  },
  source: { type: 'file', location: 'test.json', raw: {} },
});

const createContext = (): RuleContext => ({
  allTools: [],
  ruleConfig: true,
});

describe('NAM-006: Parameter names should use consistent casing', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-006');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('warning');
    expect(rule.description).toBe('Parameter names should use consistent casing (camelCase recommended)');
  });

  describe('passing cases', () => {
    it('should pass for all camelCase parameters', () => {
      const tool = createTool({
        userId: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for single camelCase parameter', () => {
      const tool = createTool({
        userName: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for empty properties', () => {
      const tool = createTool({});
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for consistent snake_case (but warn about non-camelCase)', () => {
      const tool = createTool({
        user_id: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      // Should warn about not using camelCase, but no inconsistency issue
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues.some(i => i.message.includes('camelCase'))).toBe(true);
    });

    it('should pass for single-word lowercase parameters', () => {
      const tool = createTool({
        id: { type: 'string' },
        name: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases - inconsistent casing', () => {
    it('should fail for mixed camelCase and snake_case', () => {
      const tool = createTool({
        userId: { type: 'string' },
        first_name: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].id).toBe('NAM-006');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('inconsistent');
    });

    it('should fail for mixed camelCase and PascalCase', () => {
      const tool = createTool({
        userId: { type: 'string' },
        UserName: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues.some(i => i.message.includes('inconsistent'))).toBe(true);
    });

    it('should fail for mixed snake_case and kebab-case', () => {
      const tool = createTool({
        user_id: { type: 'string' },
        'user-name': { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('failing cases - non-camelCase recommendation', () => {
    it('should warn when all parameters use snake_case', () => {
      const tool = createTool({
        user_id: { type: 'string' },
        created_at: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues.some(i => i.message.includes('camelCase'))).toBe(true);
    });

    it('should suggest camelCase alternatives', () => {
      const tool = createTool({
        user_id: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues.some(i => i.suggestion?.includes('userId'))).toBe(true);
    });

    it('should provide path in issue', () => {
      const tool = createTool({
        user_id: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].path).toBe('inputSchema.properties');
    });
  });

  describe('edge cases', () => {
    it('should handle missing inputSchema gracefully', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: null as unknown as Record<string, unknown>,
        source: { type: 'file', location: 'test.json', raw: {} },
      };
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should handle missing properties gracefully', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: { type: 'object' },
        source: { type: 'file', location: 'test.json', raw: {} },
      };
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should handle non-object inputSchema', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: 'invalid' as unknown as Record<string, unknown>,
        source: { type: 'file', location: 'test.json', raw: {} },
      };
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should handle SCREAMING_CASE parameters', () => {
      const tool = createTool({
        API_KEY: { type: 'string' },
        SECRET_TOKEN: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle parameters with numbers', () => {
      const tool = createTool({
        userId1: { type: 'string' },
        userId2: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });
});
