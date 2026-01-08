/**
 * Tests for SEC-010: Parameters accepting code/scripts should be documented as dangerous
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-010.js';
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

describe('SEC-010: Parameters accepting code/scripts should be documented as dangerous', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-010');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('warning');
  });

  describe('passing cases', () => {
    it('should pass when script parameter has security warning in description', () => {
      const tool = createTool({
        script: {
          type: 'string',
          description: 'DANGER: This executes arbitrary code. Use with caution.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when code parameter warns about security', () => {
      const tool = createTool({
        code: {
          type: 'string',
          description: 'Warning: Untrusted code execution may pose security risks.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when exec parameter mentions danger', () => {
      const tool = createTool({
        exec: {
          type: 'string',
          description: 'Command to execute. Danger: ensure input is sanitized.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when command has security in description', () => {
      const tool = createTool({
        command: {
          type: 'string',
          description: 'Shell command. Security note: validate before execution.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when sql has caution warning', () => {
      const tool = createTool({
        sql: {
          type: 'string',
          description: 'SQL query. Caution: may expose data if not validated.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when parameter mentions risk', () => {
      const tool = createTool({
        javascript: {
          type: 'string',
          description: 'JavaScript to run. Risk of XSS if not sanitized.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when parameter mentions unsafe', () => {
      const tool = createTool({
        eval: {
          type: 'string',
          description: 'Expression to evaluate. Unsafe for untrusted input.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-code string parameters', () => {
      const tool = createTool({
        name: { type: 'string' },
        description: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for script parameter without security warning', () => {
      const tool = createTool({
        script: {
          type: 'string',
          description: 'The script to run.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-010');
      expect(issues[0].path).toBe('inputSchema.properties.script');
    });

    it('should fail for code parameter without security warning', () => {
      const tool = createTool({
        code: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for eval parameter without security warning', () => {
      const tool = createTool({
        eval: {
          type: 'string',
          description: 'Expression to evaluate',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for exec parameter without security warning', () => {
      const tool = createTool({
        exec: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for execute parameter without security warning', () => {
      const tool = createTool({
        execute: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for command parameter without security warning', () => {
      const tool = createTool({
        command: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for cmd parameter without security warning', () => {
      const tool = createTool({
        cmd: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for shell parameter without security warning', () => {
      const tool = createTool({
        shell: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for expression parameter without security warning', () => {
      const tool = createTool({
        expression: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for query parameter without security warning', () => {
      const tool = createTool({
        query: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for sql parameter without security warning', () => {
      const tool = createTool({
        sql: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for javascript parameter without security warning', () => {
      const tool = createTool({
        javascript: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for python parameter without security warning', () => {
      const tool = createTool({
        python: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for bash parameter without security warning', () => {
      const tool = createTool({
        bash: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        script: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('security');
    });
  });

  describe('edge cases', () => {
    it('should not flag parameter without description as missing warning', () => {
      const tool = createTool({
        script: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      // The rule should still flag it because empty description also lacks warning
    });

    it('should handle case-insensitive security keywords', () => {
      const tool = createTool({
        script: {
          type: 'string',
          description: 'SECURITY: This parameter requires careful handling.',
        },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });
});
