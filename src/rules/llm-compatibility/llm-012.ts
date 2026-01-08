/**
 * LLM-012: Related tools should have consistent description patterns
 *
 * Validates that tools with similar names (same prefix) use consistent
 * description patterns for better LLM understanding.
 */

import type { Rule } from '../types.js';
import type { ToolDefinition, ValidationIssue } from '../../types/index.js';

// Patterns to extract from descriptions
interface DescriptionPattern {
  startsWithVerb: boolean;
  verbUsed: string | null;
  hasWhenClause: boolean;
  hasExamples: boolean;
  approximateLength: 'short' | 'medium' | 'long';
}

function extractPattern(description: string): DescriptionPattern {
  const trimmed = description.trim();
  const words = trimmed.split(/\s+/);
  const firstWord = words[0]?.toLowerCase() || '';

  // Common verbs that descriptions start with
  const commonVerbs = [
    'creates', 'create', 'retrieves', 'retrieve', 'gets', 'get',
    'updates', 'update', 'deletes', 'delete', 'removes', 'remove',
    'lists', 'list', 'searches', 'search', 'finds', 'find',
    'sends', 'send', 'fetches', 'fetch', 'returns', 'return',
    'generates', 'generate', 'validates', 'validate', 'checks', 'check',
    'sets', 'set', 'adds', 'add', 'inserts', 'insert',
    'saves', 'save', 'loads', 'load', 'reads', 'read', 'writes', 'write',
    'executes', 'execute', 'runs', 'run', 'starts', 'start', 'stops', 'stop',
    'enables', 'enable', 'disables', 'disable', 'configures', 'configure',
  ];

  const startsWithVerb = commonVerbs.includes(firstWord);
  const verbUsed = startsWithVerb ? firstWord : null;

  const hasWhenClause = /\b(when|if|for|used\s+to|use\s+this)\b/i.test(trimmed);
  const hasExamples = /\b(example|e\.g\.|for\s+instance|such\s+as)\b/i.test(trimmed);

  const length = trimmed.length;
  let approximateLength: 'short' | 'medium' | 'long';
  if (length < 50) {
    approximateLength = 'short';
  } else if (length < 150) {
    approximateLength = 'medium';
  } else {
    approximateLength = 'long';
  }

  return {
    startsWithVerb,
    verbUsed,
    hasWhenClause,
    hasExamples,
    approximateLength,
  };
}

function getToolPrefix(toolName: string): string | null {
  // Handle various naming conventions:
  // - kebab-case: user-create -> user
  // - snake_case: user_create -> user
  // - camelCase: userCreate -> user
  // - PascalCase: UserCreate -> User

  // Try kebab-case first
  if (toolName.includes('-')) {
    const parts = toolName.split('-');
    if (parts.length >= 2) {
      return parts[0];
    }
  }

  // Try snake_case
  if (toolName.includes('_')) {
    const parts = toolName.split('_');
    if (parts.length >= 2) {
      return parts[0];
    }
  }

  // Try camelCase/PascalCase
  const camelMatch = toolName.match(/^([a-z]+)(?=[A-Z])/);
  if (camelMatch) {
    return camelMatch[1];
  }

  const pascalMatch = toolName.match(/^([A-Z][a-z]+)(?=[A-Z])/);
  if (pascalMatch) {
    return pascalMatch[1];
  }

  return null;
}

function findRelatedTools(tool: ToolDefinition, allTools: ToolDefinition[]): ToolDefinition[] {
  const prefix = getToolPrefix(tool.name);
  if (!prefix) {
    return [];
  }

  return allTools.filter(t => {
    if (t.name === tool.name) return false;
    const otherPrefix = getToolPrefix(t.name);
    return otherPrefix === prefix;
  });
}

function describeInconsistencies(toolPattern: DescriptionPattern, relatedPatterns: DescriptionPattern[]): string[] {
  const inconsistencies: string[] = [];

  // Check verb consistency
  if (toolPattern.startsWithVerb) {
    const othersStartWithVerb = relatedPatterns.filter(p => p.startsWithVerb).length;
    if (othersStartWithVerb < relatedPatterns.length / 2) {
      // Most related tools don't start with verb but this one does
      // This isn't necessarily bad, so we don't flag it
    }
  } else {
    const othersStartWithVerb = relatedPatterns.filter(p => p.startsWithVerb).length;
    if (othersStartWithVerb > relatedPatterns.length / 2) {
      inconsistencies.push('does not start with an action verb like related tools');
    }
  }

  // Check length consistency
  const lengthCounts: Record<string, number> = { short: 0, medium: 0, long: 0 };
  for (const p of relatedPatterns) {
    lengthCounts[p.approximateLength]++;
  }
  const mostCommonLength = Object.entries(lengthCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommonLength && mostCommonLength[1] > relatedPatterns.length / 2) {
    if (toolPattern.approximateLength !== mostCommonLength[0]) {
      const lengthDescriptions: Record<string, string> = {
        short: 'shorter',
        medium: 'medium length',
        long: 'longer',
      };
      inconsistencies.push(`has ${lengthDescriptions[toolPattern.approximateLength]} description while related tools have ${lengthDescriptions[mostCommonLength[0]]} descriptions`);
    }
  }

  // Check when-clause consistency
  const othersHaveWhen = relatedPatterns.filter(p => p.hasWhenClause).length;
  if (!toolPattern.hasWhenClause && othersHaveWhen > relatedPatterns.length / 2) {
    inconsistencies.push('lacks "when to use" context that related tools have');
  }

  // Check examples consistency
  const othersHaveExamples = relatedPatterns.filter(p => p.hasExamples).length;
  if (!toolPattern.hasExamples && othersHaveExamples > relatedPatterns.length / 2) {
    inconsistencies.push('lacks examples that related tools have');
  }

  return inconsistencies;
}

const rule: Rule = {
  id: 'LLM-012',
  category: 'llm-compatibility',
  defaultSeverity: 'warning',
  description: 'Related tools should have consistent description patterns',

  check(tool, ctx) {
    const issues: ValidationIssue[] = [];

    // Skip if description is empty (handled by LLM-001)
    if (!tool.description || tool.description.trim() === '') {
      return issues;
    }

    // Find related tools
    const relatedTools = findRelatedTools(tool, ctx.allTools);

    // Need at least 2 related tools to establish a pattern
    if (relatedTools.length < 2) {
      return issues;
    }

    // Extract patterns
    const toolPattern = extractPattern(tool.description);
    const relatedPatterns = relatedTools
      .filter(t => t.description && t.description.trim() !== '')
      .map(t => extractPattern(t.description));

    if (relatedPatterns.length < 2) {
      return issues;
    }

    // Find inconsistencies
    const inconsistencies = describeInconsistencies(toolPattern, relatedPatterns);

    if (inconsistencies.length > 0) {
      const prefix = getToolPrefix(tool.name);
      const relatedNames = relatedTools.slice(0, 3).map(t => t.name).join(', ');
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message: `Tool description is inconsistent with related '${prefix}-*' tools: ${inconsistencies.join('; ')}`,
        tool: tool.name,
        path: 'description',
        suggestion: `Align description style with related tools (${relatedNames}) for consistency`,
      });
    }

    return issues;
  },
};

export default rule;
