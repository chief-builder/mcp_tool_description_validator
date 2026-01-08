/**
 * Tests for SEC-008: No default values for security-sensitive parameters
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-008.js';
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

describe('SEC-008: No default values for security-sensitive parameters', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-008');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('error');
  });

  describe('passing cases', () => {
    it('should pass for sensitive parameter without default', () => {
      const tool = createTool({
        password: { type: 'string' },
        token: { type: 'string' },
        apiKey: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-sensitive parameter with default', () => {
      const tool = createTool({
        name: { type: 'string', default: 'Anonymous' },
        count: { type: 'number', default: 10 },
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
    it('should fail for password with default', () => {
      const tool = createTool({
        password: { type: 'string', default: 'admin123' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-008');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].path).toBe('inputSchema.properties.password');
    });

    it('should fail for token with default', () => {
      const tool = createTool({
        token: { type: 'string', default: 'test-token' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for secret with default', () => {
      const tool = createTool({
        secret: { type: 'string', default: 'my-secret' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for apiKey with default', () => {
      const tool = createTool({
        apiKey: { type: 'string', default: 'sk-test-key' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for api_key with default', () => {
      const tool = createTool({
        api_key: { type: 'string', default: 'test-key' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for compound sensitive names with default', () => {
      const tool = createTool({
        userPassword: { type: 'string', default: 'password' },
        accessToken: { type: 'string', default: 'token' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should fail for empty string default on sensitive parameter', () => {
      const tool = createTool({
        password: { type: 'string', default: '' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        password: { type: 'string', default: 'admin' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('Remove the default');
    });
  });
});
