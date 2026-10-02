/**
 * Tests for SCH-010: x-mcp-header finalized spec constraints
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/schema/sch-010.js';
import type {
  ToolDefinition,
  ToolSource,
} from '../../../../src/types/index.js';
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

/** Schema with one string property carrying the given x-mcp-header value. */
function headerSchema(headerValue: unknown, type: unknown = 'string') {
  return {
    type: 'object',
    properties: {
      region: { type, 'x-mcp-header': headerValue },
    },
  };
}

describe('SCH-010: x-mcp-header constraints', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('SCH-010');
    expect(rule.category).toBe('schema');
    expect(rule.defaultSeverity).toBe('error');
    expect(rule.specVersions).toEqual(['2026-07-28']);
  });

  it('should pass when no x-mcp-header is present', () => {
    const tool = createTool({
      type: 'object',
      properties: { region: { type: 'string' } },
    });
    expect(check(tool)).toHaveLength(0);
  });

  it('should skip when inputSchema is missing (SCH-003 handles this)', () => {
    const tool = createTool(undefined);
    expect(check(tool)).toHaveLength(0);
  });

  describe('valid header values', () => {
    const validCases: Array<[unknown, unknown]> = [
      ['region', 'string'],
      ['Region-Name', 'string'],
      ["x!#$%&'*+-.^_`|~1", 'string'],
      ['retries', 'integer'],
      ['dry-run', 'boolean'],
    ];

    for (const [value, type] of validCases) {
      it(`should accept "${value}" on a ${type} parameter`, () => {
        expect(check(createTool(headerSchema(value, type)))).toHaveLength(0);
      });
    }
  });

  describe('invalid header values', () => {
    it('should flag an empty string', () => {
      const issues = check(createTool(headerSchema('')));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('must not be empty');
      expect(issues[0].path).toBe('inputSchema.properties.region.x-mcp-header');
    });

    it('should flag a non-string value', () => {
      for (const value of [42, true, null, { name: 'region' }, ['region']]) {
        const issues = check(createTool(headerSchema(value)));
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toContain('must be a string');
      }
    });

    it('should flag CR/LF and control characters', () => {
      for (const value of [
        'bad\r\nheader',
        'bad\nheader',
        'bad\theader',
        'bad\u0000header',
      ]) {
        const issues = check(createTool(headerSchema(value)));
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toContain('control characters');
      }
    });

    it('should flag values outside RFC 9110 token syntax', () => {
      for (const value of [
        'has space',
        'colon:name',
        'brace{name}',
        'slash/name',
        'q=1',
        'ünïcode',
        '"quoted"',
      ]) {
        const issues = check(createTool(headerSchema(value)));
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toContain('RFC 9110');
        expect(issues[0].message).toContain(value);
      }
    });
  });

  describe('case-insensitive uniqueness', () => {
    it('should flag duplicate header names differing only in case', () => {
      const tool = createTool({
        type: 'object',
        properties: {
          a: { type: 'string', 'x-mcp-header': 'Region' },
          b: { type: 'string', 'x-mcp-header': 'region' },
        },
      });
      const issues = check(tool);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('duplicates');
      expect(issues[0].path).toBe('inputSchema.properties.b.x-mcp-header');
      expect(issues[0].message).toContain('inputSchema.properties.a');
    });

    it('should flag exact duplicates', () => {
      const tool = createTool({
        type: 'object',
        properties: {
          a: { type: 'string', 'x-mcp-header': 'region' },
          b: { type: 'string', 'x-mcp-header': 'region' },
        },
      });
      expect(check(tool)).toHaveLength(1);
    });

    it('should detect duplicates across nesting levels', () => {
      const tool = createTool({
        type: 'object',
        properties: {
          a: { type: 'string', 'x-mcp-header': 'region' },
          nested: {
            type: 'object',
            properties: {
              b: { type: 'string', 'x-mcp-header': 'REGION' },
            },
          },
        },
      });
      expect(check(tool)).toHaveLength(1);
    });

    it('should allow distinct header names', () => {
      const tool = createTool({
        type: 'object',
        properties: {
          a: { type: 'string', 'x-mcp-header': 'region' },
          b: { type: 'string', 'x-mcp-header': 'zone' },
        },
      });
      expect(check(tool)).toHaveLength(0);
    });
  });

  describe('primitive type constraint', () => {
    it('should reject `number` explicitly', () => {
      const issues = check(createTool(headerSchema('region', 'number')));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('"number"');
      expect(issues[0].message).toContain('integer');
    });

    it('should reject non-primitive types', () => {
      for (const type of ['object', 'array']) {
        const issues = check(createTool(headerSchema('region', type)));
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toContain(`"${type}"`);
      }
    });

    it('should reject a missing or non-string type', () => {
      const noType = {
        type: 'object',
        properties: {
          region: { 'x-mcp-header': 'region' },
        },
      };
      expect(check(createTool(noType))).toHaveLength(1);
      expect(
        check(createTool(headerSchema('region', ['string', 'null'])))
      ).toHaveLength(1);
    });
  });

  describe('static reachability', () => {
    it('should allow nested properties reached only through properties keys', () => {
      const tool = createTool({
        type: 'object',
        properties: {
          routing: {
            type: 'object',
            properties: {
              region: { type: 'string', 'x-mcp-header': 'region' },
            },
          },
        },
      });
      expect(check(tool)).toHaveLength(0);
    });

    it.each(['items', 'oneOf', 'anyOf', 'allOf', '$defs'])(
      'should reject annotations reached through %s',
      (keyword) => {
        const annotated = {
          type: 'object',
          properties: {
            region: { type: 'string', 'x-mcp-header': 'region' },
          },
        };
        const schema =
          keyword === 'items'
            ? {
                type: 'object',
                properties: { values: { type: 'array', items: annotated } },
              }
            : keyword === '$defs'
              ? { type: 'object', $defs: { annotated } }
              : { type: 'object', [keyword]: [annotated] };

        const issues = check(createTool(schema));
        expect(
          issues.some((issue) =>
            issue.message.includes('not statically reachable')
          )
        ).toBe(true);
      }
    );
  });

  it('should report an invalid value and an invalid type as separate checks', () => {
    // Invalid string value short-circuits before the type check
    const issues = check(createTool(headerSchema('has space', 'object')));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('RFC 9110');
  });
});
