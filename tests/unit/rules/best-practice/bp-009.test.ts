/**
 * BP-009: Consider providing outputSchema for better output validation and parsing
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-009.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

function createTool(
  overrides: Partial<ToolDefinition> = {},
  rawOverrides: Record<string, unknown> = {}
): ToolDefinition {
  const raw = {
    name: overrides.name ?? 'test-tool',
    description: overrides.description ?? 'A test tool',
    inputSchema: overrides.inputSchema ?? { type: 'object', properties: {} },
    ...rawOverrides,
  };
  return {
    name: 'test-tool',
    description: 'A test tool',
    inputSchema: { type: 'object', properties: {} },
    source: { type: 'file', location: '/test.json', raw },
    ...overrides,
  };
}

function createContext(tools: ToolDefinition[] = []): RuleContext {
  return {
    allTools: tools,
    ruleConfig: true,
  };
}

describe('BP-009: outputSchema validation', () => {
  describe('missing outputSchema', () => {
    it('should report issue when outputSchema is missing', () => {
      const tool = createTool();
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('BP-009');
      expect(issues[0].severity).toBe('suggestion');
      expect(issues[0].message).toContain('missing outputSchema');
      expect(issues[0].path).toBe('outputSchema');
    });
  });

  describe('invalid outputSchema', () => {
    it('should report issue when outputSchema is not an object', () => {
      const tool = createTool({}, { outputSchema: 'invalid' });
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('valid JSON Schema object');
    });

    it('should report issue when outputSchema is an array', () => {
      const tool = createTool({}, { outputSchema: [] });
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
    });

    it('should report issue when outputSchema is null', () => {
      const tool = createTool({}, { outputSchema: null });
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
    });
  });

  describe('outputSchema type validation', () => {
    it('should report issue when outputSchema is missing type', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            properties: {
              result: { type: 'string' },
            },
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.type')).toBe(true);
      expect(issues.find((i) => i.path === 'outputSchema.type')?.severity).toBe('warning');
    });

    it('should pass when outputSchema has type as string', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: 'Output description',
            properties: {
              result: { type: 'string', description: 'Result description' },
            },
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.type')).toBe(false);
    });

    it('should pass when outputSchema has type as array (union type)', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: ['object', 'null'],
            description: 'Output description',
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.type')).toBe(false);
    });
  });

  describe('outputSchema description validation', () => {
    it('should report issue when outputSchema is missing description', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            properties: {},
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.description')).toBe(true);
      expect(issues.find((i) => i.path === 'outputSchema.description')?.severity).toBe('suggestion');
    });

    it('should report issue when outputSchema description is empty', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: '   ',
            properties: {},
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.description')).toBe(true);
    });

    it('should pass when outputSchema has description', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: 'The output of the tool',
            properties: {},
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.description')).toBe(false);
    });
  });

  describe('outputSchema properties validation', () => {
    it('should report issue when all properties are missing descriptions', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: 'Output description',
            properties: {
              result: { type: 'string' },
              count: { type: 'number' },
            },
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.properties')).toBe(true);
      expect(issues.find((i) => i.path === 'outputSchema.properties')?.message).toContain(
        'missing descriptions'
      );
    });

    it('should report issue when some properties are missing descriptions', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: 'Output description',
            properties: {
              result: { type: 'string', description: 'The result' },
              count: { type: 'number' },
              status: { type: 'string' },
            },
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.properties')).toBe(true);
      expect(issues.find((i) => i.path === 'outputSchema.properties')?.message).toContain('2 of 3');
    });

    it('should pass when all properties have descriptions', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: 'Output description',
            properties: {
              result: { type: 'string', description: 'The result' },
              count: { type: 'number', description: 'The count' },
            },
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.properties')).toBe(false);
    });

    it('should pass when object has no properties', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: 'Empty output',
            properties: {},
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.properties')).toBe(false);
    });

    it('should not check properties for non-object types', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'string',
            description: 'A string result',
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues.some((i) => i.path === 'outputSchema.properties')).toBe(false);
    });
  });

  describe('well-defined outputSchema', () => {
    it('should pass with a well-defined outputSchema', () => {
      const tool = createTool(
        {},
        {
          outputSchema: {
            type: 'object',
            description: 'The result of the operation',
            properties: {
              success: { type: 'boolean', description: 'Whether the operation succeeded' },
              data: { type: 'object', description: 'The result data' },
              error: { type: 'string', description: 'Error message if failed' },
            },
            required: ['success'],
          },
        }
      );
      const ctx = createContext([tool]);

      const issues = rule.check(tool, ctx);

      expect(issues).toHaveLength(0);
    });
  });

  describe('rule metadata', () => {
    it('should have correct rule metadata', () => {
      expect(rule.id).toBe('BP-009');
      expect(rule.category).toBe('best-practice');
      expect(rule.defaultSeverity).toBe('suggestion');
      expect(rule.description).toContain('outputSchema');
      expect(rule.documentation).toBeDefined();
    });
  });
});
