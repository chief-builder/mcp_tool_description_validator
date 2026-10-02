/**
 * SCH-009: `$ref` must not resolve to a network URI
 *
 * The MCP specification says implementations MUST NOT automatically
 * dereference $ref values that resolve to network URIs. Schemas that rely
 * on external network references should be rejected rather than silently
 * treated as permissive. Local references ("#/...", "#/$defs/...") are fine.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { walkSchema } from '../utils/schema-walker.js';

/** True when a $ref value points at a network location. */
function isNetworkRef(ref: string): boolean {
  return (
    ref.startsWith('http://') ||
    ref.startsWith('https://') ||
    ref.startsWith('//')
  );
}

const rule: Rule = {
  id: 'SCH-009',
  category: 'schema',
  defaultSeverity: 'error',
  specVersions: ['2026-07-28'],
  description: '$ref must not resolve to a network URI',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/basic/index#$ref-resolution',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if inputSchema is missing (caught by SCH-003)
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return issues;
    }

    walkSchema(tool.inputSchema, ({ schema, path }) => {
      const ref = schema.$ref;
      if (typeof ref === 'string' && isNetworkRef(ref)) {
        issues.push({
          id: 'SCH-009',
          category: 'schema',
          severity: this.defaultSeverity,
          message: `$ref "${ref}" resolves to a network URI. The MCP spec forbids automatic network dereferencing, so this schema would be rejected`,
          tool: tool.name || '(unnamed)',
          path: `${path}.$ref`,
          suggestion:
            'Inline the referenced schema, or move it into $defs and reference it locally (e.g. "#/$defs/mySchema")',
          documentation: this.documentation,
        });
      }
    });

    return issues;
  },
};

export default rule;
