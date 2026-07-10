/**
 * NAM-005: Tool name should use descriptive verbs
 *
 * Validates that tool names start with action verbs that clearly indicate
 * what the tool does. This improves discoverability and helps LLMs
 * understand when to use the tool.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { tokenizeIdentifier } from '../utils/text.js';

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
  'move',
  'copy',
  'rename',
  // Archive operations
  'zip',
  'unzip',
  'compress',
  'decompress',
  'extract',
  'archive',
  // Output/Display operations
  'print',
  'echo',
  'log',
  'show',
  'display',
  'render',
  // State operations
  'open',
  'close',
  'init',
  'initialize',
  'connect',
  'disconnect',
  // Testing operations
  'sample',
  'test',
  'try',
  'ping',
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
  'merge',
  'split',
  'filter',
  'sort',
  'group',
  'map',
  'reduce',
  'apply',
  'call',
  'invoke',
  'trigger',
  'notify',
  'publish',
  'subscribe',
  'download',
  'upload',
  'install',
  'uninstall',
  'register',
  'unregister',
  'authenticate',
  'authorize',
  'revoke',
  'cancel',
  'abort',
  'terminate',
  'kill',
  'clone',
  'fork',
  'branch',
  'checkout',
  'commit',
  'push',
  'pull',
  'revert',
  'rollback',
  'deploy',
  'build',
  'compile',
  'bundle',
  'minify',
  'optimize',
  'lint',
  'scan',
  'detect',
  'monitor',
  'watch',
  'track',
  'record',
  'replay',
  'undo',
  'redo',
  'backup',
  'restore',
  'encrypt',
  'decrypt',
  'sign',
  'hash',
  'encode',
  'decode',
  'serialize',
  'deserialize',
  'sanitize',
  'escape',
  'unescape',
  'wrap',
  'unwrap',
  'bind',
  'unbind',
  'attach',
  'detach',
  'mount',
  'unmount',
  'lock',
  'unlock',
  'grant',
  'deny',
  'allow',
  'block',
  'accept',
  'reject',
  'approve',
  'request',
  'respond',
  'handle',
  'dispatch',
  'route',
  'forward',
  'redirect',
  'proxy',
  'cache',
  'flush',
  'purge',
  'invalidate',
  'expire',
  'extend',
  'renew',
  'schedule',
  'queue',
  'dequeue',
  'enqueue',
  'pop',
  'peek',
  'poll',
  'wait',
  'sleep',
  'pause',
  'resume',
  'retry',
  'repeat',
  'loop',
  'iterate',
  'traverse',
  'visit',
  'walk',
  'crawl',
  'scrape',
  'harvest',
  'collect',
  'gather',
  'aggregate',
  'summarize',
  'report',
  'dump',
  'stream',
  'pipe',
  'tee',
  'broadcast',
  'multicast',
  'unicast',
];

const DESCRIPTIVE_VERB_SET = new Set(DESCRIPTIVE_VERBS);

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

    // Check if the first token of the name is a descriptive verb.
    // Exact token equality avoids false passes like "settings-panel"
    // matching the "set" prefix.
    const firstToken = tokenizeIdentifier(tool.name)[0];
    const hasDescriptiveVerb =
      firstToken !== undefined && DESCRIPTIVE_VERB_SET.has(firstToken);

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
