/**
 * Tests for NAM-002: Tool name must match the MCP spec grammar
 * (1-128 characters, only [A-Za-z0-9_.-])
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/naming/nam-002.js';
import type { ToolDefinition } from '../../../../src/types/index.js';
import type { RuleContext } from '../../../../src/rules/types.js';

const createTool = (name: string): ToolDefinition => ({
  name,
  description: 'Test tool description',
  inputSchema: { type: 'object', properties: {} },
  source: { type: 'file', location: 'test.json', raw: {} },
});

const createContext = (): RuleContext => ({
  allTools: [],
  ruleConfig: true,
});

const recommendationIssues = (name: string) =>
  rule
    .check(createTool(name), createContext())
    .filter((i) => i.severity === 'warning');

describe('NAM-002: Tool name must match the MCP spec grammar', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('NAM-002');
    expect(rule.category).toBe('naming');
    expect(rule.defaultSeverity).toBe('warning');
    expect(rule.documentation).toBe(
      'https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool-names'
    );
  });

  describe('spec-valid names (must produce zero error-severity findings)', () => {
    it.each([
      'getUser', // camelCase (spec example)
      'DATA_EXPORT_v2', // SCREAMING + version (spec example)
      'admin.tools.list', // dot namespacing (spec example)
      'read_file', // snake_case
      'get-user', // kebab-case
      'GetUser', // PascalCase
      'list', // single word
      'a', // single character (minimum length)
      'a'.repeat(128), // maximum length
    ])('should pass for %s', (name) => {
      expect(recommendationIssues(name)).toHaveLength(0);
    });
  });

  describe('spec-invalid names', () => {
    it('should fail for name with a space', () => {
      const issues = recommendationIssues('my tool');
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('NAM-002');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('discouraged character');
    });

    it('should fail for name with a comma', () => {
      const issues = recommendationIssues('tool,name');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('","');
    });

    it('should fail for name exceeding 128 characters', () => {
      const issues = recommendationIssues('a'.repeat(129));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('129');
      expect(issues[0].message).toContain('128');
    });

    it('should fail for name with a special character', () => {
      const issues = recommendationIssues('tool$name');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('"$"');
    });

    it('should report both length and character problems', () => {
      const issues = recommendationIssues(`${'a'.repeat(128)} b`);
      expect(issues).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should skip empty names (handled by SCH-001)', () => {
      const issues = rule.check(createTool(''), createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip whitespace-only names (handled by SCH-001)', () => {
      const issues = rule.check(createTool('   '), createContext());
      expect(issues).toHaveLength(0);
    });

    it('should provide path and documentation in issue', () => {
      const issues = recommendationIssues('my tool');
      expect(issues[0].path).toBe('name');
      expect(issues[0].documentation).toBe(rule.documentation);
    });
  });
});
