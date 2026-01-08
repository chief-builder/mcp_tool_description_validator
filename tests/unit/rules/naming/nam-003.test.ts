/**
 * Tests for NAM-003: Tool name should be 3-50 characters
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-003.js';
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

describe('NAM-003: Tool name should be 3-50 characters', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-003');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('warning');
    expect(rule.description).toBe('Tool name should be 3-50 characters');
  });

  describe('passing cases', () => {
    it('should pass for name with exactly 3 characters', () => {
      const tool = createTool('get');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name with exactly 50 characters', () => {
      const tool = createTool('a'.repeat(50));
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for typical name length', () => {
      const tool = createTool('get-user-profile');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name at boundary (4 characters)', () => {
      const tool = createTool('list');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name at boundary (49 characters)', () => {
      const tool = createTool('a'.repeat(49));
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases - too short', () => {
    it('should fail for 2 character name', () => {
      const tool = createTool('ab');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-003');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('too short');
      expect(issues[0].message).toContain('2 characters');
    });

    it('should fail for 1 character name', () => {
      const tool = createTool('a');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('1 characters');
    });

    it('should provide helpful suggestion for too short', () => {
      const tool = createTool('ab');
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('more descriptive');
    });
  });

  describe('failing cases - too long', () => {
    it('should fail for 51 character name', () => {
      const tool = createTool('a'.repeat(51));
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-003');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('too long');
      expect(issues[0].message).toContain('51 characters');
    });

    it('should fail for very long name', () => {
      const tool = createTool('a'.repeat(100));
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('100 characters');
    });

    it('should provide helpful suggestion for too long', () => {
      const tool = createTool('a'.repeat(60));
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('shorter');
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

    it('should include path in issue', () => {
      const tool = createTool('ab');
      const issues = rule.check(tool, createContext());
      expect(issues[0].path).toBe('name');
    });
  });
});
