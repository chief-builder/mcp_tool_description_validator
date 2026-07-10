/**
 * NAM-002: Tool name must match the MCP spec grammar
 *
 * The MCP specification says tool names SHOULD be 1-128 characters and
 * contain only the characters [A-Za-z0-9_.-]. Names are case-sensitive.
 * Valid (from the spec): getUser, DATA_EXPORT_v2, admin.tools.list
 * Invalid: "my tool" (space), "tool,name" (comma), names over 128 chars
 *
 * Casing style (kebab/snake/camel) is NOT part of the spec grammar and
 * is intentionally not checked here.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/** Maximum tool name length per the MCP spec. */
const MAX_NAME_LENGTH = 128;

/** Characters allowed in tool names per the MCP spec. */
const VALID_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;

const rule: Rule = {
  id: 'NAM-002',
  category: 'naming',
  defaultSeverity: 'error',
  description: 'Tool name must be 1-128 characters using only [A-Za-z0-9_.-]',
  documentation:
    'https://modelcontextprotocol.io/specification/draft/server/tools#tool-names',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if name is empty (handled by SCH-001)
    if (!tool.name || tool.name.trim() === '') {
      return issues;
    }

    if (tool.name.length > MAX_NAME_LENGTH) {
      issues.push({
        id: 'NAM-002',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Tool name is ${tool.name.length} characters long; the MCP spec limits names to ${MAX_NAME_LENGTH} characters`,
        tool: tool.name,
        path: 'name',
        suggestion: `Shorten the tool name to at most ${MAX_NAME_LENGTH} characters`,
        documentation: this.documentation,
      });
    }

    if (!VALID_NAME_REGEX.test(tool.name)) {
      const illegalChars = [
        ...new Set(tool.name.replace(/[A-Za-z0-9_.-]/g, '')),
      ];
      issues.push({
        id: 'NAM-002',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" contains illegal character(s): ${illegalChars
          .map((c) => JSON.stringify(c))
          .join(', ')}. The MCP spec allows only letters, digits, underscores, dots, and hyphens`,
        tool: tool.name,
        path: 'name',
        suggestion:
          'Remove spaces, commas, and other special characters; use only [A-Za-z0-9_.-]',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
