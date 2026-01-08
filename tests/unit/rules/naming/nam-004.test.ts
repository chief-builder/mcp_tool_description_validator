/**
 * Tests for NAM-004: Tool name should not start with numbers
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-004.js';
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

describe('NAM-004: Tool name should not start with numbers', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-004');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('warning');
    expect(rule.description).toBe('Tool name should not start with numbers');
  });

  describe('passing cases', () => {
    it('should pass for name starting with letter', () => {
      const tool = createTool('get-user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name with numbers in middle', () => {
      const tool = createTool('get-user-v2');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name ending with numbers', () => {
      const tool = createTool('process-123');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for single letter name', () => {
      const tool = createTool('a');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name starting with uppercase letter', () => {
      const tool = createTool('GetUser');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for name starting with 0', () => {
      const tool = createTool('0-get-user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-004');
      expect(issues[0].severity).toBe('warning');
    });

    it('should fail for name starting with 1', () => {
      const tool = createTool('1st-tool');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for name starting with 9', () => {
      const tool = createTool('9lives');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for purely numeric name', () => {
      const tool = createTool('12345');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool('123-process');
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('descriptive verb');
    });

    it('should include path in issue', () => {
      const tool = createTool('123tool');
      const issues = rule.check(tool, createContext());
      expect(issues[0].path).toBe('name');
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
  });
});
