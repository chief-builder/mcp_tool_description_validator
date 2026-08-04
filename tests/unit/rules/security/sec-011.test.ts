/**
 * Tests for SEC-011: sensitive parameters must not be exposed via x-mcp-header
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-011.js';
import type { ToolDefinition, ToolSource } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createTool(inputSchema: unknown): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool',
    inputSchema: inputSchema as ToolDefinition['inputSchema'],
    source: mockSource,
  };
}

function check(tool: ToolDefinition) {
  const ctx: RuleContext = { allTools: [tool], ruleConfig: true };
  return rule.check(tool, ctx);
}

describe('SEC-011: sensitive parameter exposed as header', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SEC-011');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('error');
    expect(rule.specVersions).toEqual(['2026-07-28']);
  });

  it('should flag a sensitive parameter carrying x-mcp-header', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        api_key: { type: 'string', 'x-mcp-header': 'api-key' },
      },
    });

    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SEC-011');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('api_key');
    expect(issues[0].message.toLowerCase()).toContain('intermediaries');
    expect(issues[0].path).toBe(
      'inputSchema.properties.api_key.x-mcp-header'
    );
  });

  it('should flag camelCase sensitive names (token-aware)', () => {
    for (const name of ['apiKey', 'accessToken', 'clientSecret', 'userPassword']) {
      const tool = createTool({
        type: 'object',
        properties: {
          [name]: { type: 'string', 'x-mcp-header': 'auth-value' },
        },
      });
      expect(check(tool)).toHaveLength(1);
    }
  });

  it('should flag nested sensitive parameters', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        credentials: {
          type: 'object',
          properties: {
            token: { type: 'string', 'x-mcp-header': 'session-token' },
          },
        },
      },
    });

    const issues = check(tool);
    // 'credentials' has no x-mcp-header; only the nested 'token' does
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe(
      'inputSchema.properties.credentials.properties.token.x-mcp-header'
    );
  });

  it('should not flag a sensitive parameter without x-mcp-header', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        password: { type: 'string' },
      },
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should not flag a non-sensitive parameter with x-mcp-header', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        region: { type: 'string', 'x-mcp-header': 'region' },
      },
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should not treat similar but distinct words as sensitive (author != auth)', () => {
    const tool = createTool({
      type: 'object',
      properties: {
        author: { type: 'string', 'x-mcp-header': 'author' },
      },
    });

    expect(check(tool)).toHaveLength(0);
  });

  it('should handle missing inputSchema gracefully', () => {
    expect(check(createTool(undefined))).toHaveLength(0);
  });
});
