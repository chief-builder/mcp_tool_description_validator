/**
 * SCH-010: x-mcp-header values must satisfy the MCP spec constraints
 *
 * The MCP 2026-07-28 spec allows a property's JSON Schema to carry an
 * `x-mcp-header` extension: its value is the name portion of a
 * Mcp-Param-{name} HTTP header. Constraints:
 * - MUST NOT be empty
 * - MUST match RFC 9110 field-name token syntax (1*tchar)
 * - MUST NOT contain CR/LF or other control characters
 * - MUST be case-insensitively unique among all x-mcp-header values
 *   in the inputSchema
 * - MUST only appear on primitive-typed params (string, integer,
 *   boolean — `number` is NOT permitted)
 * Clients MUST reject tools with invalid x-mcp-header values.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { walkSchema } from '../utils/schema-walker.js';

const X_MCP_HEADER = 'x-mcp-header';

/** RFC 9110 field-name token: 1*tchar */
const TCHAR_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/** Control characters (including CR/LF) anywhere in the value. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Property types x-mcp-header is permitted on. `number` is excluded. */
const PRIMITIVE_HEADER_TYPES = new Set(['string', 'integer', 'boolean']);

const rule: Rule = {
  id: 'SCH-010',
  category: 'schema',
  defaultSeverity: 'error',
  specVersions: ['2026-07-28'],
  description: 'x-mcp-header values must satisfy the MCP constraints',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/server/tools#x-mcp-header',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if inputSchema is missing (caught by SCH-003)
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      return issues;
    }

    const emit = (path: string, message: string, suggestion: string): void => {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message,
        tool: tool.name || '(unnamed)',
        path,
        suggestion,
        documentation: this.documentation,
      });
    };

    // First occurrence of each header value (lowercased) for uniqueness
    const seen = new Map<string, string>();

    walkSchema(tool.inputSchema, ({ schema, path, staticallyReachable }) => {
      if (!(X_MCP_HEADER in schema)) return;
      const value = schema[X_MCP_HEADER];
      const headerPath = `${path}.${X_MCP_HEADER}`;

      if (!staticallyReachable) {
        emit(
          headerPath,
          `x-mcp-header at ${path} is not statically reachable from the schema root through properties keys only`,
          'Move the annotation to a property reachable solely through nested properties (not items, composition, conditionals, $defs, or $ref)'
        );
      }

      if (typeof value !== 'string') {
        emit(
          headerPath,
          `x-mcp-header at ${path} must be a string, got ${value === null ? 'null' : typeof value}`,
          'Set x-mcp-header to the name portion of the Mcp-Param-{name} header (e.g. "region")'
        );
        return;
      }

      if (value.length === 0) {
        emit(
          headerPath,
          `x-mcp-header at ${path} must not be empty. Clients MUST reject tools with invalid x-mcp-header values`,
          'Provide a non-empty header name (RFC 9110 token characters only)'
        );
        return;
      }

      if (CONTROL_CHARS.test(value)) {
        emit(
          headerPath,
          `x-mcp-header ${JSON.stringify(value)} at ${path} contains CR/LF or other control characters, which is forbidden`,
          'Remove all control characters; header names may only use RFC 9110 token characters'
        );
        return;
      }

      if (!TCHAR_TOKEN.test(value)) {
        emit(
          headerPath,
          `x-mcp-header "${value}" at ${path} is not a valid RFC 9110 field-name token. Only alphanumerics and !#$%&'*+-.^_\`|~ are allowed`,
          'Use only RFC 9110 token characters (no spaces, colons, or other separators)'
        );
        return;
      }

      // Case-insensitive uniqueness across the whole inputSchema
      const lower = value.toLowerCase();
      const firstPath = seen.get(lower);
      if (firstPath !== undefined) {
        emit(
          headerPath,
          `x-mcp-header "${value}" at ${path} duplicates the header already declared at ${firstPath} (header names are case-insensitive and must be unique)`,
          'Choose a distinct header name for each parameter'
        );
      } else {
        seen.set(lower, path);
      }

      // Primitive-typed params only; `number` explicitly not permitted
      const type = schema.type;
      if (typeof type !== 'string' || !PRIMITIVE_HEADER_TYPES.has(type)) {
        const typeLabel =
          typeof type === 'string' ? `"${type}"` : JSON.stringify(type);
        const numberHint =
          type === 'number'
            ? ' (`number` is not permitted; use `integer` instead)'
            : '';
        emit(
          headerPath,
          `x-mcp-header "${value}" at ${path} is on a parameter of type ${typeLabel}, but headers are only allowed on string, integer, or boolean parameters${numberHint}`,
          'Move the header mapping to a primitive-typed parameter (string, integer, or boolean)'
        );
      }
    });

    return issues;
  },
};

export default rule;
