/**
 * Tests for SEC-006: Command/query parameters should use enum when values are known
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-006.js';
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

describe('SEC-006: Command/query parameters should use enum when values are known', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-006');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('warning');
  });

  describe('passing cases', () => {
    it('should pass when command has enum', () => {
      const tool = createTool({
        command: { type: 'string', enum: ['start', 'stop', 'restart'] },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when action has enum', () => {
      const tool = createTool({
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when method has enum', () => {
      const tool = createTool({
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when type has enum', () => {
      const tool = createTool({
        type: { type: 'string', enum: ['user', 'admin', 'guest'] },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-command string parameters', () => {
      const tool = createTool({
        name: { type: 'string' },
        description: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-string types with command-like names', () => {
      const tool = createTool({
        commandCount: { type: 'number' },
        hasAction: { type: 'boolean' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for command without enum', () => {
      const tool = createTool({
        command: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-006');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].path).toBe('inputSchema.properties.command');
    });

    it('should fail for query without enum', () => {
      const tool = createTool({
        query: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for action without enum', () => {
      const tool = createTool({
        action: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for method without enum', () => {
      const tool = createTool({
        method: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for operation without enum', () => {
      const tool = createTool({
        operation: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for mode without enum', () => {
      const tool = createTool({
        mode: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for type without enum', () => {
      const tool = createTool({
        type: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for kind without enum', () => {
      const tool = createTool({
        kind: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        action: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('enum');
    });
  });
});
