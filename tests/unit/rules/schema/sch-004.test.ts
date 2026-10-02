import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-004.js';
import type {
  ToolDefinition,
  ToolSource,
} from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const mockSource: ToolSource = { type: 'file', location: 'test.json', raw: {} };

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

describe('SCH-004: inputSchema must be valid JSON Schema', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-004');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
  });

  it('should pass for valid JSON Schema', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          count: { type: 'integer', minimum: 0 },
        },
        required: ['userId'],
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should pass for empty object schema', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'object' },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should pass for schema with format', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          url: { type: 'string', format: 'uri' },
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should fail for invalid JSON Schema type', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'invalid-type' }, // Invalid type
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('SCH-004');
    expect(issues[0].severity).toBe('error');
  });

  it('should skip when inputSchema is missing (SCH-003 handles this)', () => {
    const tool = {
      name: 'test-tool',
      description: 'A test tool',
      source: mockSource,
    } as unknown as ToolDefinition;

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(0);
  });

  it('should include error details in message', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'not-a-real-type' },
        },
      },
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues[0].message).toContain('inputSchema is not valid JSON Schema');
    expect(issues[0].path).toBe('inputSchema');
    expect(issues[0].suggestion).toBeDefined();
  });

  describe('dialect handling', () => {
    it('should validate two tools sharing the same $id without collision', () => {
      const makeTool = (name: string): ToolDefinition => ({
        name,
        description: 'A test tool',
        inputSchema: {
          $id: 'https://example.com/shared-schema',
          type: 'object',
          properties: { value: { type: 'string' } },
        },
        source: mockSource,
      });

      const toolA = makeTool('tool-a');
      const toolB = makeTool('tool-b');

      expect(rule.check(toolA, createContext(toolA))).toHaveLength(0);
      expect(rule.check(toolB, createContext(toolB))).toHaveLength(0);
    });

    it('should compile 2020-12 keywords like prefixItems by default', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            coords: {
              type: 'array',
              prefixItems: [{ type: 'number' }, { type: 'number' }],
            },
          },
        },
        source: mockSource,
      };

      const issues = rule.check(tool, createContext(tool));
      expect(issues).toHaveLength(0);
    });

    it('should validate schemas with an explicit draft-07 $schema', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: [{ type: 'string' }], // tuple form, valid in draft-07
            },
          },
        },
        source: mockSource,
      };

      const issues = rule.check(tool, createContext(tool));
      expect(issues).toHaveLength(0);
    });

    it('should report an unknown dialect as unsupported', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          $schema: 'https://example.com/my-custom-dialect',
          type: 'object',
        },
        source: mockSource,
      };

      const issues = rule.check(tool, createContext(tool));
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SCH-004');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('unsupported');
      expect(issues[0].path).toBe('inputSchema.$schema');
    });
  });

  describe('outputSchema', () => {
    it('should accept any valid JSON Schema 2020-12 shape', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        outputSchema: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'integer' } },
          ],
        },
        source: mockSource,
      };

      expect(rule.check(tool, createContext(tool))).toHaveLength(0);
    });

    it('should reject an invalid outputSchema', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        outputSchema: {
          properties: { value: { type: 'not-a-json-schema-type' } },
        },
        source: mockSource,
      };

      const issues = rule.check(tool, createContext(tool));
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toBe('outputSchema');
      expect(issues[0].severity).toBe('error');
    });

    it('should reject a non-object outputSchema', () => {
      const tool = {
        name: 'test-tool',
        inputSchema: { type: 'object' },
        outputSchema: [],
        source: mockSource,
      } as unknown as ToolDefinition;

      const issues = rule.check(tool, createContext(tool));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('JSON Schema object');
    });
  });

  it('should reject schemas that exceed bounded validation depth', () => {
    let deepSchema: Record<string, unknown> = { type: 'string' };
    for (let index = 0; index < 60; index++) {
      deepSchema = {
        type: 'object',
        properties: { nested: deepSchema },
      };
    }
    const tool: ToolDefinition = {
      name: 'deep-tool',
      inputSchema: deepSchema,
      source: mockSource,
    };

    const issues = rule.check(tool, createContext(tool));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('resource limits');
  });
});
