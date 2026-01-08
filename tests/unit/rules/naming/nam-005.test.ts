/**
 * Tests for NAM-005: Tool name should use descriptive verbs
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-005.js';
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

describe('NAM-005: Tool name should use descriptive verbs', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-005');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('warning');
    expect(rule.description).toBe('Tool name should use descriptive verbs');
  });

  describe('passing cases - common verbs', () => {
    it('should pass for get-* names', () => {
      const tool = createTool('get-user');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for create-* names', () => {
      const tool = createTool('create-document');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for update-* names', () => {
      const tool = createTool('update-profile');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for delete-* names', () => {
      const tool = createTool('delete-record');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for list-* names', () => {
      const tool = createTool('list-items');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for search-* names', () => {
      const tool = createTool('search-products');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('passing cases - other valid verbs', () => {
    it('should pass for find-* names', () => {
      const tool = createTool('find-users');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for fetch-* names', () => {
      const tool = createTool('fetch-data');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for add-* names', () => {
      const tool = createTool('add-item');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for remove-* names', () => {
      const tool = createTool('remove-tag');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for set-* names', () => {
      const tool = createTool('set-config');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for check-* names', () => {
      const tool = createTool('check-status');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for validate-* names', () => {
      const tool = createTool('validate-input');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for run-* names', () => {
      const tool = createTool('run-task');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for execute-* names', () => {
      const tool = createTool('execute-query');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for read-* names', () => {
      const tool = createTool('read-file');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for write-* names', () => {
      const tool = createTool('write-file');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for send-* names', () => {
      const tool = createTool('send-email');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for generate-* names', () => {
      const tool = createTool('generate-report');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for convert-* names', () => {
      const tool = createTool('convert-format');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for sync-* names', () => {
      const tool = createTool('sync-data');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for noun-only name', () => {
      const tool = createTool('user-profile');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-005');
      expect(issues[0].severity).toBe('warning');
    });

    it('should fail for adjective-starting name', () => {
      const tool = createTool('quick-search');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for name without verb prefix', () => {
      const tool = createTool('data-processor');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for generic name', () => {
      const tool = createTool('tool');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool('user-data');
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('get-');
      expect(issues[0].suggestion).toContain('create-');
    });

    it('should include path in issue', () => {
      const tool = createTool('data');
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

    it('should handle single-word verb names', () => {
      const tool = createTool('get');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should handle verb as standalone (no hyphen)', () => {
      const tool = createTool('list');
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });
});
