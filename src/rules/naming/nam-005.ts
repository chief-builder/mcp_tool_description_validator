/**
 * NAM-005: Tool name should use descriptive verbs
 *
 * Validates that tool names start with action verbs that clearly indicate
 * what the tool does. This improves discoverability and helps LLMs
 * understand when to use the tool.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/**
 * Common action verbs that clearly indicate tool purpose.
 * Organized by operation type for clarity.
 */
const DESCRIPTIVE_VERBS = [
  // CRUD operations
  'get',
  'create',
  'update',
  'delete',
  'list',
  // Search/Query operations
  'search',
  'find',
  'fetch',
  'query',
  'lookup',
  // Modification operations
  'add',
  'remove',
  'set',
  'edit',
  'modify',
  // Validation/Analysis operations
  'check',
  'validate',
  'verify',
  'analyze',
  'inspect',
  // Action operations
  'run',
  'execute',
  'process',
  'send',
  'submit',
  // File operations
  'read',
  'write',
  'save',
  'load',
  'export',
  'import',
  // Other common operations
  'start',
  'stop',
  'enable',
  'disable',
  'generate',
  'convert',
  'transform',
  'format',
  'parse',
  'sync',
  'refresh',
  'clear',
  'reset',
  'count',
  'calculate',
  'compare',
];

const rule: Rule = {
  id: 'NAM-005',
  category: 'naming',
  defaultSeverity: 'warning',
  description: 'Tool name should use descriptive verbs',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if name is empty (handled by NAM-001)
    if (!tool.name || tool.name.trim() === '') {
      return issues;
    }

    // Extract the first segment (before first hyphen)
    const firstSegment = tool.name.split('-')[0].toLowerCase();

    // Check if the name starts with a descriptive verb
    const hasDescriptiveVerb = DESCRIPTIVE_VERBS.some(
      (verb) => firstSegment === verb || firstSegment.startsWith(verb)
    );

    if (!hasDescriptiveVerb) {
      issues.push({
        id: 'NAM-005',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Tool name "${tool.name}" should start with a descriptive verb`,
        tool: tool.name,
        path: 'name',
        suggestion: `Consider using a verb prefix like: get-, create-, update-, delete-, list-, search-, find-, fetch-, add-, remove-, set-, check-, validate-`,
      });
    }

    return issues;
  },
};

export default rule;
