/**
 * Tests for SEC-004: File path parameters must use pattern for path validation
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/security/sec-004.js';
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

describe('SEC-004: File path parameters must use pattern for path validation', () => {
  it('should have correct metadata', () => {
    expect(rule.id).toBe('SEC-004');
    expect(rule.category).toBe('security');
    expect(rule.defaultSeverity).toBe('error');
  });

  describe('passing cases', () => {
    it('should pass when path parameter has pattern', () => {
      const tool = createTool({
        filePath: { type: 'string', pattern: '^[a-zA-Z0-9_\\-./]+$' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when directory parameter has pattern', () => {
      const tool = createTool({
        directory: { type: 'string', pattern: '^/[a-z]+/' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-path string parameters', () => {
      const tool = createTool({
        name: { type: 'string' },
        email: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for non-string types with path-like names', () => {
      const tool = createTool({
        pathCount: { type: 'number' },
        isFilePath: { type: 'boolean' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('failing cases', () => {
    it('should fail for filePath without pattern', () => {
      const tool = createTool({
        filePath: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('SEC-004');
      expect(issues[0].path).toBe('inputSchema.properties.filePath');
    });

    it('should fail for file parameter without pattern', () => {
      const tool = createTool({
        file: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for dir parameter without pattern', () => {
      const tool = createTool({
        dir: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for directory parameter without pattern', () => {
      const tool = createTool({
        directory: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for folder parameter without pattern', () => {
      const tool = createTool({
        folder: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should fail for filename parameter without pattern', () => {
      const tool = createTool({
        filename: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should detect path in compound names', () => {
      const tool = createTool({
        outputPath: { type: 'string' },
        sourceFile: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should provide helpful suggestion about path traversal', () => {
      const tool = createTool({
        path: { type: 'string' },
      });
      const issues = rule.check(tool, createContext());
      expect(issues[0].suggestion).toContain('pattern');
      expect(issues[0].suggestion).toContain('path traversal');
    });
  });
});
