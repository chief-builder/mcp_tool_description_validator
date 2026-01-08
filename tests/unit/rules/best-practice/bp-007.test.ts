/**
 * BP-007: Deeply nested schemas (>4 levels) hurt usability
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-007.js';
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

describe('BP-007: schema depth limit', () => {
  it('should pass with depth 1', () => {
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

  it('should pass with depth 3', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              address: {
                type: 'object',
                properties: {
                  city: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should pass with depth 4 (limit)', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      level4: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should report issue with depth 5', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      level4: {
                        type: 'object',
                        properties: {
                          level5: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-007');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('5 levels');
    expect(issues[0].message).toContain('exceeds');
  });

  it('should count depth through array items', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nested: {
                  type: 'object',
                  properties: {
                    deep: {
                      type: 'object',
                      properties: {
                        veryDeep: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-007');
  });

  it('should pass with empty properties', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {},
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(0);
  });

  it('should handle additionalProperties depth', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });
    const ctx = createContext([tool]);

    const issues = rule.check(tool, ctx);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('BP-007');
  });

  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-007');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('warning');
  });
});
