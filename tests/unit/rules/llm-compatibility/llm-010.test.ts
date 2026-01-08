/**
 * Tests for LLM-010: Avoid jargon and abbreviations without explanation
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/llm-compatibility/llm-010.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool description',
    inputSchema: { type: 'object', properties: {} },
    source: { type: 'file', location: 'test.json', raw: {} },
    ...overrides,
  };
}

function createContext(tools: ToolDefinition[] = []): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('LLM-010: Avoid jargon and abbreviations without explanation', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('LLM-010');
    expect(rule.category).toBe('llm-compatibility');
    expect(rule.defaultSeverity).toBe('warning');
  });

  it('should pass for parameter with full words', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The unique identifier for the user',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for "id" abbreviation without explanation', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The id to look up',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('LLM-010');
    expect(issues[0].message).toContain('id');
  });

  it('should pass for "id" when "identifier" is in description', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The unique identifier for the record',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for "cfg" abbreviation', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          cfg: {
            type: 'object',
            description: 'The cfg object',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('cfg');
  });

  it('should pass for "cfg" when "configuration" is explained', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          cfg: {
            type: 'object',
            description: 'The configuration object for the service',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should fail for "env" abbreviation without explanation', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          env: {
            type: 'string',
            description: 'The env to use',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(1);
  });

  it('should pass for "env" when "environment" is explained', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          env: {
            type: 'string',
            description: 'The environment name (prod, staging, dev)',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });

  it('should handle multiple abbreviations', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          src: { type: 'string', description: 'The src path' },
          dst: { type: 'string', description: 'The dst path' },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    // Both should be flagged because "source" and "destination" are not in descriptions
    expect(issues).toHaveLength(2);
  });

  it('should provide suggestion with full form', () => {
    const tool = createTool({
      inputSchema: {
        type: 'object',
        properties: {
          num: {
            type: 'integer',
            description: 'The num to use',
          },
        },
      },
    });
    const issues = rule.check(tool, createContext([tool]));
    expect(issues[0].suggestion).toContain('number');
  });

  it('should handle missing inputSchema gracefully', () => {
    const tool = createTool();
    // @ts-expect-error - testing missing inputSchema
    tool.inputSchema = undefined;
    const issues = rule.check(tool, createContext([tool]));
    expect(issues).toHaveLength(0);
  });
});
