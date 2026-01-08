/**
 * Tests for NAM-001: Tool name must be non-empty
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-001.js';
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

describe('NAM-001: Tool name must be non-empty', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-001');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('error');
    expect(rule.description).toBe('Tool name must be non-empty');
  });

  describe('passing cases', () => {
    it('should pass for valid non-empty name', () => {
      const tool = createTool('get-user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for single character name', () => {
      const tool = createTool('a');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for name with numbers', () => {
      const tool = createTool('get-user-v2');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for empty string name', () => {
      const tool = createTool('');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-001');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].tool).toBe('(unnamed)');
    });

    it('should fail for whitespace-only name', () => {
      const tool = createTool('   ');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-001');
    });

    it('should fail for tab-only name', () => {
      const tool = createTool('\t\t');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-001');
    });

    it('should fail for newline-only name', () => {
      const tool = createTool('\n');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-001');
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool('');
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('descriptive kebab-case name');
    });

    it('should include path in issue', () => {
      const tool = createTool('');
      const issues = rule.check(tool, createContext());
      expect(issues[0].path).toBe('name');
    });
  });
});
