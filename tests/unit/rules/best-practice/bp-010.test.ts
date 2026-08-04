/**
 * BP-010: Tool icons must be well-formed and use safe sources
 */

import { describe, it, expect } from 'vitest';
import rule from '../../../../src/rules/best-practice/bp-010.js';
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

function createContext(tool: ToolDefinition): RuleContext {
  return { allTools: [tool], ruleConfig: true };
}

function check(tool: ToolDefinition) {
  return rule.check(tool, createContext(tool));
}

describe('BP-010: icons validation', () => {
  it('should have correct rule metadata', () => {
    expect(rule.id).toBe('BP-010');
    expect(rule.category).toBe('best-practice');
    expect(rule.defaultSeverity).toBe('warning');
    expect(rule.specVersions).toBeUndefined();
  });

  it('should pass when icons is absent', () => {
    expect(check(createTool())).toHaveLength(0);
  });

  it('should pass for a valid https icon with a known mimeType', () => {
    const tool = createTool({
      icons: [
        { src: 'https://example.com/icon-48.png', mimeType: 'image/png', sizes: ['48x48'] },
        { src: 'https://example.com/icon-dark.png', mimeType: 'image/png', theme: 'dark' },
      ],
    });
    expect(check(tool)).toHaveLength(0);
  });

  it('should pass for a data: URI icon', () => {
    const tool = createTool({
      icons: [{ src: 'data:image/png;base64,iVBORw0KGgo=' }],
    });
    expect(check(tool)).toHaveLength(0);
  });

  describe('scheme matrix', () => {
    const unsafeSrcs = [
      'http://example.com/icon.png',
      'javascript:alert(1)',
      'file:///etc/icons/icon.png',
      'ftp://example.com/icon.png',
      'ws://example.com/icon',
      'myapp://icon',
      '//example.com/icon.png',
      'icon.png',
    ];

    for (const src of unsafeSrcs) {
      it(`should flag "${src}" at error severity`, () => {
        const tool = createTool({ icons: [{ src }] });
        const issues = check(tool);
        expect(issues).toHaveLength(1);
        expect(issues[0].severity).toBe('error');
        expect(issues[0].path).toBe('icons[0].src');
        expect(issues[0].message).toContain(src);
      });
    }

    const safeSrcs = [
      'https://example.com/icon.png',
      'HTTPS://EXAMPLE.COM/ICON.PNG',
      'data:image/jpeg;base64,AAAA',
    ];

    for (const src of safeSrcs) {
      it(`should accept "${src}"`, () => {
        const tool = createTool({ icons: [{ src }] });
        expect(check(tool)).toHaveLength(0);
      });
    }
  });

  it('should flag a non-array icons value at error severity', () => {
    const tool = createTool({
      icons: { src: 'https://example.com/icon.png' } as unknown as ToolDefinition['icons'],
    });
    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].path).toBe('icons');
  });

  it('should flag a non-object entry at error severity', () => {
    const tool = createTool({
      icons: ['https://example.com/icon.png'] as unknown as ToolDefinition['icons'],
    });
    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].path).toBe('icons[0]');
  });

  it('should flag a missing src at error severity', () => {
    const tool = createTool({
      icons: [{ mimeType: 'image/png' }] as unknown as ToolDefinition['icons'],
    });
    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].path).toBe('icons[0].src');
  });

  it('should flag an unknown mimeType at suggestion severity', () => {
    const tool = createTool({
      icons: [{ src: 'https://example.com/icon.ico', mimeType: 'image/x-icon' }],
    });
    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].path).toBe('icons[0].mimeType');
    expect(issues[0].message).toContain('image/x-icon');
  });

  it('should note the script-execution risk for image/svg+xml at suggestion severity', () => {
    const tool = createTool({
      icons: [{ src: 'https://example.com/icon.svg', mimeType: 'image/svg+xml' }],
    });
    const issues = check(tool);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('suggestion');
    expect(issues[0].message.toLowerCase()).toContain('script');
  });

  it('should report each entry of a mixed array independently', () => {
    const tool = createTool({
      icons: [
        { src: 'https://example.com/icon.png', mimeType: 'image/png' }, // ok
        { src: 'javascript:alert(1)' }, // error
        { src: 'https://example.com/icon.svg', mimeType: 'image/svg+xml' }, // suggestion
      ],
    });
    const issues = check(tool);
    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.severity).sort()).toEqual(['error', 'suggestion']);
  });

  it('should validate sizes and theme shapes', () => {
    const tool = createTool({
      icons: [{
        src: 'https://example.com/icon.png',
        sizes: ['48', '0x48'],
        theme: 'system' as 'light',
      }],
    });
    const issues = check(tool);
    expect(issues.filter((issue) => issue.path?.includes('sizes'))).toHaveLength(2);
    expect(issues.find((issue) => issue.path?.endsWith('theme'))?.severity).toBe('error');
  });

  it('should reject malformed data URIs', () => {
    const issues = check(createTool({ icons: [{ src: 'data:text/html,hello' }] }));
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });
});
