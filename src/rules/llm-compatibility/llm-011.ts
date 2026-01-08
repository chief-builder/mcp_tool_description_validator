/**
 * LLM-011: Tool description should mention side effects if any
 *
 * Validates that tools with side effects (creating, deleting, modifying,
 * sending data) mention these effects in their description.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

// Keywords indicating side effects in tool names
const SIDE_EFFECT_NAME_PATTERNS = [
  // Create/Add operations
  'create', 'add', 'new', 'insert', 'post', 'make',
  // Update/Modify operations
  'update', 'edit', 'modify', 'change', 'set', 'put', 'patch',
  // Delete/Remove operations
  'delete', 'remove', 'destroy', 'drop', 'clear', 'purge', 'reset',
  // Send/Transmit operations
  'send', 'emit', 'publish', 'broadcast', 'dispatch', 'push', 'notify',
  // Write/Store operations
  'write', 'save', 'store', 'persist', 'commit', 'sync',
  // Execute/Run operations
  'execute', 'run', 'trigger', 'invoke', 'fire', 'start', 'stop',
  // Import/Export operations
  'import', 'export', 'upload', 'download',
  // Move/Copy operations
  'move', 'copy', 'transfer', 'migrate',
  // Configuration operations
  'configure', 'enable', 'disable', 'activate', 'deactivate',
  // Auth operations
  'login', 'logout', 'signup', 'register', 'revoke',
  // Approval operations
  'approve', 'reject', 'cancel', 'confirm',
];

// Keywords that indicate side effects are mentioned in description
const SIDE_EFFECT_DESCRIPTION_PATTERNS = [
  // Creation indicators
  /\bcreates?\b/i,
  /\badds?\b/i,
  /\binserts?\b/i,
  /\bgenerates?\b/i,
  /\bproduces?\b/i,
  /\bwill\s+create\b/i,
  /\bwill\s+add\b/i,

  // Update indicators
  /\bupdates?\b/i,
  /\bmodif(y|ies)\b/i,
  /\bchanges?\b/i,
  /\bedits?\b/i,
  /\bmutates?\b/i,
  /\balters?\b/i,
  /\bwill\s+update\b/i,
  /\bwill\s+modify\b/i,

  // Delete indicators
  /\bdeletes?\b/i,
  /\bremoves?\b/i,
  /\bdestroys?\b/i,
  /\bpurges?\b/i,
  /\bclears?\b/i,
  /\bwill\s+delete\b/i,
  /\bwill\s+remove\b/i,
  /\bpermanent(ly)?\b/i,
  /\birreversible\b/i,

  // Send indicators
  /\bsends?\b/i,
  /\bemits?\b/i,
  /\bpublishes?\b/i,
  /\bbroadcasts?\b/i,
  /\bdispatches?\b/i,
  /\bpushes?\b/i,
  /\bnotif(y|ies)\b/i,
  /\bwill\s+send\b/i,

  // Write indicators
  /\bwrites?\b/i,
  /\bsaves?\b/i,
  /\bstores?\b/i,
  /\bpersists?\b/i,
  /\bcommits?\b/i,
  /\blogs?\b/i,
  /\brecords?\b/i,
  /\bwill\s+write\b/i,
  /\bwill\s+save\b/i,

  // Execution indicators
  /\bexecutes?\b/i,
  /\btriggers?\b/i,
  /\binvokes?\b/i,
  /\bfires?\b/i,
  /\bstarts?\b/i,
  /\bstops?\b/i,
  /\blaunches?\b/i,
  /\bterminates?\b/i,

  // General side effect indicators
  /\bside\s+effects?\b/i,
  /\bcauses?\b/i,
  /\bresults?\s+in\b/i,
  /\baffects?\b/i,
  /\bimpacts?\b/i,
  /\bnote\s*:/i,
  /\bwarning\s*:/i,
  /\bcaution\s*:/i,
  /\bimportant\s*:/i,

  // Network indicators
  /\bmakes?\s+(a\s+)?(api\s+)?call\b/i,
  /\bcontacts?\b/i,
  /\bconnects?\s+to\b/i,
  /\brequests?\b/i,

  // State change indicators
  /\bstate\s+change\b/i,
  /\bmodifies?\s+state\b/i,
  /\bupdates?\s+state\b/i,
];

function toolNameSuggestsSideEffects(toolName: string): boolean {
  const nameLower = toolName.toLowerCase();
  return SIDE_EFFECT_NAME_PATTERNS.some(pattern => {
    // Check if pattern is at word boundary (start, after -, or after _)
    const regex = new RegExp(`(^|[-_])${pattern}([-_]|$)`, 'i');
    return regex.test(nameLower) || nameLower.startsWith(pattern) || nameLower.endsWith(pattern);
  });
}

function descriptionMentionsSideEffects(description: string): boolean {
  return SIDE_EFFECT_DESCRIPTION_PATTERNS.some(pattern => pattern.test(description));
}

const rule: Rule = {
  id: 'LLM-011',
  category: 'llm-compatibility',
  defaultSeverity: 'suggestion',
  description: 'Tool description should mention side effects if any',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if description is empty (handled by LLM-001)
    if (!tool.description || tool.description.trim() === '') {
      return issues;
    }

    // Check if tool name suggests it has side effects
    if (toolNameSuggestsSideEffects(tool.name)) {
      // Check if description mentions the side effects
      if (!descriptionMentionsSideEffects(tool.description)) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Tool '${tool.name}' appears to have side effects but description does not mention them`,
          tool: tool.name,
          path: 'description',
          suggestion: 'Clearly state what changes this tool makes (e.g., "Creates a new record...", "Deletes the file permanently...")',
        });
      }
    }

    // Also check annotations for destructive hint
    if (tool.annotations?.destructiveHint === true) {
      const mentionsDestructive = /\b(destruct|delet|remov|destroy|permanent|irreversible|cannot\s+be\s+undone)\b/i.test(tool.description);
      if (!mentionsDestructive) {
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Tool '${tool.name}' is marked as destructive but description does not warn about this`,
          tool: tool.name,
          path: 'description',
          suggestion: 'Add a warning about the destructive nature (e.g., "Warning: This permanently deletes...")',
        });
      }
    }

    return issues;
  },
};

export default rule;
