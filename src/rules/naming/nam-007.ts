/**
 * NAM-007: Tool names must be unique within a server
 *
 * The MCP specification says tool names SHOULD be unique within a server
 * (comparison is case-sensitive). This rule reports an error on every
 * 2nd+ occurrence of a duplicated name. It also emits a warning when two
 * names differ only by case (e.g. getUser vs getuser), since names are
 * case-sensitive per spec but case-only differences invite confusion.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

const rule: Rule = {
  id: 'NAM-007',
  category: 'naming',
  defaultSeverity: 'error',
  description: 'Tool names must be unique within a server',
  documentation:
    'https://modelcontextprotocol.io/specification/draft/server/tools#tool-names',

  check(tool, ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if name is empty (handled by SCH-001)
    if (!tool.name || tool.name.trim() === '') {
      return issues;
    }

    const myIndex = ctx.allTools.indexOf(tool);
    const earlierTools = ctx.allTools.slice(0, myIndex);

    // Exact duplicate (case-sensitive): report on 2nd+ occurrence only.
    if (earlierTools.some((t) => t.name === tool.name)) {
      issues.push({
        id: 'NAM-007',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Duplicate tool name "${tool.name}": tool names should be unique within a server`,
        tool: tool.name,
        path: 'name',
        suggestion: 'Rename this tool so every tool name is unique',
        documentation: this.documentation,
      });
    }

    // Case-only collision: same name ignoring case, but not an exact match.
    const caseCollision = earlierTools.find(
      (t) =>
        typeof t.name === 'string' &&
        t.name !== tool.name &&
        t.name.toLowerCase() === tool.name.toLowerCase()
    );
    if (caseCollision) {
      issues.push({
        id: 'NAM-007',
        category: 'naming',
        severity: 'warning',
        message: `Tool name "${tool.name}" differs only by case from "${caseCollision.name}". Names are case-sensitive, but case-only differences invite confusion`,
        tool: tool.name,
        path: 'name',
        suggestion: 'Choose names that differ by more than letter case',
        documentation: this.documentation,
      });
    }

    return issues;
  },
};

export default rule;
