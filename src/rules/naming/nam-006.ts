/**
 * NAM-006: Parameter names should use consistent casing (camelCase recommended)
 *
 * Validates that all parameter names in the tool's inputSchema use consistent
 * casing. camelCase is recommended as it's the standard convention in JSON
 * and JavaScript/TypeScript ecosystems.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/**
 * Casing type detected for a parameter name.
 */
type CasingType = 'camelCase' | 'snake_case' | 'kebab-case' | 'PascalCase' | 'SCREAMING_CASE' | 'other';

/**
 * Detect the casing type of a parameter name.
 * Single-word lowercase names are treated as camelCase since they're valid in that convention.
 */
function detectCasing(name: string): CasingType {
  // SCREAMING_SNAKE_CASE (all uppercase with underscores, must have underscore)
  if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(name)) {
    return 'SCREAMING_CASE';
  }

  // Single uppercase word (like API, ID) - treat as SCREAMING_CASE
  if (/^[A-Z][A-Z0-9]*$/.test(name) && name.length > 1) {
    return 'SCREAMING_CASE';
  }

  // snake_case (lowercase with underscores, must have underscore to distinguish)
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(name)) {
    return 'snake_case';
  }

  // kebab-case (lowercase with hyphens, must have hyphen to distinguish)
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) {
    return 'kebab-case';
  }

  // PascalCase (starts with uppercase, has mixed case or just one uppercase letter)
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name) && /[a-z]/.test(name)) {
    return 'PascalCase';
  }

  // camelCase (starts with lowercase, no separators)
  // This includes single-word lowercase names like "id", "name"
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
    return 'camelCase';
  }

  return 'other';
}

/**
 * Convert a name to camelCase for suggestions.
 */
function toCamelCase(name: string): string {
  return name
    .replace(/[-_]([a-z])/g, (_, letter: string) => letter.toUpperCase())
    .replace(/^[A-Z]/, (letter) => letter.toLowerCase());
}

const rule: Rule = {
  id: 'NAM-006',
  category: 'naming',
  defaultSeverity: 'warning',
  description: 'Parameter names should use consistent casing (camelCase recommended)',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    // Check if inputSchema has properties
    const schema = tool.inputSchema;
    if (typeof schema !== 'object' || schema === null) {
      return issues;
    }

    const properties = schema.properties as Record<string, unknown> | undefined;
    if (!properties || typeof properties !== 'object') {
      return issues;
    }

    const paramNames = Object.keys(properties);
    if (paramNames.length === 0) {
      return issues;
    }

    // Detect casing for each parameter
    const casingMap = new Map<string, CasingType>();
    const casingCounts = new Map<CasingType, number>();

    for (const name of paramNames) {
      const casing = detectCasing(name);
      casingMap.set(name, casing);
      casingCounts.set(casing, (casingCounts.get(casing) || 0) + 1);
    }

    // Find the most common casing (or default to camelCase if mixed)
    let dominantCasing: CasingType = 'camelCase';
    let maxCount = 0;
    for (const [casing, count] of casingCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantCasing = casing;
      }
    }

    // Check for inconsistent casing
    const inconsistentParams: string[] = [];
    for (const [name, casing] of casingMap) {
      if (casing !== dominantCasing && casing !== 'other') {
        inconsistentParams.push(name);
      }
    }

    if (inconsistentParams.length > 0) {
      issues.push({
        id: 'NAM-006',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Parameter names have inconsistent casing. Found mixed styles: ${Array.from(casingCounts.keys()).join(', ')}`,
        tool: tool.name,
        path: 'inputSchema.properties',
        suggestion: `Use consistent ${dominantCasing} for all parameters. Inconsistent: ${inconsistentParams.join(', ')}`,
      });
    }

    // Additionally warn if not using camelCase (recommended)
    const nonCamelCaseParams = paramNames.filter((name) => {
      const casing = casingMap.get(name);
      return casing !== 'camelCase' && casing !== 'other';
    });

    if (nonCamelCaseParams.length > 0 && dominantCasing !== 'camelCase') {
      issues.push({
        id: 'NAM-006',
        category: 'naming',
        severity: this.defaultSeverity,
        message: `Parameter names should use camelCase (current: ${dominantCasing})`,
        tool: tool.name,
        path: 'inputSchema.properties',
        suggestion: `Consider renaming: ${nonCamelCaseParams.map((p) => `${p} -> ${toCamelCase(p)}`).join(', ')}`,
      });
    }

    return issues;
  },
};

export default rule;
