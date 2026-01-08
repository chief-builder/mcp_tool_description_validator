/**
 * BP-008: Provide examples in inputSchema for complex parameters
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-008.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool',
    inputSchema: { type: 'object', properties: {} },
    source: { type: 'file', location: '/test.json', raw: {} },
    ...overrides,
  };
}

function createContext(tools: ToolDefinition[] = []): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('BP-008: examples for complex parameters', () => {
  it('should pass with simple string parameter', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue for object parameter without examples', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              timeout: { type: 'number' },
              retries: { type: 'number' },
            },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-008');
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message).toContain('config');
    expect(issues[0].message).toContain('missing examples');
    expect(issues[0].path).toBe('inputSchema.properties.config');
  });

  it('should pass for object parameter with examples', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              timeout: { type: 'number' },
            },
            examples: [{ timeout: 30 }],
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass for object parameter with example (singular)', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              timeout: { type: 'number' },
            },
            example: { timeout: 30 },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass for object parameter with default', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              timeout: { type: 'number' },
            },
            default: { timeout: 30 },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue for array parameter without examples', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-008');
    expect(issues[0].message).toContain('tags');
  });

  it('should pass for array parameter with examples', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            examples: [['tag1', 'tag2']],
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue for oneOf without examples', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          value: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-008');
  });

  it('should report issue for large enum without examples', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'active', 'completed', 'cancelled', 'archived'],
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-008');
  });

  it('should pass for small enum without examples', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['on', 'off'],
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report multiple issues for multiple complex params', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: { value: { type: 'string' } },
          },
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.path)).toContain(
      'inputSchema.properties.config'
    );
    expect(issues.map((i) => i.path)).toContain('inputSchema.properties.items');
  });

  it('should pass when properties is missing', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-008');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('suggestion');
  });
});
