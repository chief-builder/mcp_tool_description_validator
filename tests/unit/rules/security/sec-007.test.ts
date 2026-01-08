/**
 * Tests for SEC-007: Sensitive parameter names should be flagged
 */

import { describe, it, expect } from 'vitest';
import rule, { isSensitiveParameter } from '../../../../src/rules/security/sec-007.js';
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

describe('SEC-007: Sensitive parameter names should be flagged', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-007');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('warning');
  });

  describe('isSensitiveParameter helper', () => {
    it('should detect password', () => {
      expect(isSensitiveParameter('password')).toBe(true);
      expect(isSensitiveParameter('Password')).toBe(true);
      expect(isSensitiveParameter('userPassword')).toBe(true);
    });

    it('should detect token', () => {
      expect(isSensitiveParameter('token')).toBe(true);
      expect(isSensitiveParameter('accessToken')).toBe(true);
      expect(isSensitiveParameter('authToken')).toBe(true);
    });

    it('should detect secret', () => {
      expect(isSensitiveParameter('secret')).toBe(true);
      expect(isSensitiveParameter('clientSecret')).toBe(true);
    });

    it('should detect api_key and apikey', () => {
      expect(isSensitiveParameter('api_key')).toBe(true);
      expect(isSensitiveParameter('apiKey')).toBe(true);
      expect(isSensitiveParameter('apikey')).toBe(true);
    });

    it('should detect auth', () => {
      expect(isSensitiveParameter('auth')).toBe(true);
      expect(isSensitiveParameter('authHeader')).toBe(true);
    });

    it('should detect credential', () => {
      expect(isSensitiveParameter('credential')).toBe(true);
      expect(isSensitiveParameter('credentials')).toBe(true);
    });

    it('should detect private_key', () => {
      expect(isSensitiveParameter('privateKey')).toBe(true);
      expect(isSensitiveParameter('private_key')).toBe(true);
    });

    it('should detect access_key', () => {
      expect(isSensitiveParameter('accessKey')).toBe(true);
      expect(isSensitiveParameter('access_key')).toBe(true);
    });

    it('should not flag non-sensitive names', () => {
      expect(isSensitiveParameter('name')).toBe(false);
      expect(isSensitiveParameter('email')).toBe(false);
      expect(isSensitiveParameter('userId')).toBe(false);
    });
  });

  describe('passing cases', () => {
    it('should pass for non-sensitive parameter names', () => {
      const tool = createTool({
        name: { type: 'string' },
        email: { type: 'string' },
        userId: { type: 'string' },
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
    it('should flag password parameter', () => {
      const tool = createTool({
        password: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-007');
      expect(issues[0].path).toBe('inputSchema.properties.password');
    });

    it('should flag token parameter', () => {
      const tool = createTool({
        token: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should flag secret parameter', () => {
      const tool = createTool({
        secret: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should flag apiKey parameter', () => {
      const tool = createTool({
        apiKey: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should flag api_key parameter', () => {
      const tool = createTool({
        api_key: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should flag compound names with sensitive words', () => {
      const tool = createTool({
        userPassword: { type: 'string' },
        accessToken: { type: 'string' },
        clientSecret: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(3);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        password: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('securely');
    });
  });
});
