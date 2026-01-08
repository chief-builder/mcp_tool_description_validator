/**
 * Tests for SEC-005: URL parameters must use format: "uri"
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-005.js';
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

describe('SEC-005: URL parameters must use format: "uri"', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-005');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('error');
  });

  describe('passing cases', () => {
    it('should pass when url parameter has format uri', () => {
      const tool = createTool({
        callbackUrl: { type: 'string', format: 'uri' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when uri parameter has format uri', () => {
      const tool = createTool({
        resourceUri: { type: 'string', format: 'uri' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when href parameter has format uri', () => {
      const tool = createTool({
        href: { type: 'string', format: 'uri' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-URL string parameters', () => {
      const tool = createTool({
        name: { type: 'string' },
        description: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-string types with URL-like names', () => {
      const tool = createTool({
        urlCount: { type: 'number' },
        hasUrl: { type: 'boolean' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for url parameter without format', () => {
      const tool = createTool({
        url: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-005');
      expect(issues[0].path).toBe('inputSchema.properties.url');
    });

    it('should fail for uri parameter without format', () => {
      const tool = createTool({
        uri: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for href parameter without format', () => {
      const tool = createTool({
        href: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for link parameter without format', () => {
      const tool = createTool({
        link: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for endpoint parameter without format', () => {
      const tool = createTool({
        endpoint: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should detect URL in compound names', () => {
      const tool = createTool({
        callbackUrl: { type: 'string' },
        webhookUri: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should fail for url with wrong format', () => {
      const tool = createTool({
        url: { type: 'string', format: 'email' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should provide helpful suggestion', () => {
      const tool = createTool({
        url: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('format');
      expect(issues[0].suggestion).toContain('uri');
    });
  });
});
