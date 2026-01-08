/**
 * Tests for NAM-002: Tool name must use kebab-case format
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-002.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const createTool = (name: string): ToolDefinition => ({
  name,
  description: 'Test tool description',
  inputSchema: { type: 'object', properties: {} },
  source: { type: 'file', location: 'test.json', raw: {} },
});

const createContext = (): RuleContext => ({
  allTools: [],
  ruleConfig: true,
});

describe('NAM-002: Tool name must use kebab-case format', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-002');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('error');
    expect(rule.description).toBe('Tool name must use kebab-case format');
  });

  describe('passing cases', () => {
    it('should pass for simple kebab-case name', () => {
      const tool = createTool('get-user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for single word lowercase name', () => {
      const tool = createTool('list');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for multi-segment kebab-case name', () => {
      const tool = createTool('get-user-profile-data');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name with numbers', () => {
      const tool = createTool('get-user-v2');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name starting with letter followed by numbers', () => {
      const tool = createTool('process3d-model');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for camelCase name', () => {
      const tool = createTool('getUser');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-002');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].suggestion).toContain('get-user');
    });

    it('should fail for PascalCase name', () => {
      const tool = createTool('GetUser');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].suggestion).toContain('get-user');
    });

    it('should fail for snake_case name', () => {
      const tool = createTool('get_user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].suggestion).toContain('get-user');
    });

    it('should fail for uppercase name', () => {
      const tool = createTool('GET-USER');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for name with spaces', () => {
      const tool = createTool('get user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].suggestion).toContain('get-user');
    });

    it('should fail for name starting with hyphen', () => {
      const tool = createTool('-get-user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for name ending with hyphen', () => {
      const tool = createTool('get-user-');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for name with consecutive hyphens', () => {
      const tool = createTool('get--user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for name starting with number', () => {
      const tool = createTool('123-get-user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should skip empty names (handled by NAM-001)', () => {
      const tool = createTool('');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip whitespace-only names (handled by NAM-001)', () => {
      const tool = createTool('   ');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should provide path in issue', () => {
      const tool = createTool('getUser');
      const issues = rule.check(tool, createContext());
      expect(issues[0].path).toBe('name');
    });
  });
});
