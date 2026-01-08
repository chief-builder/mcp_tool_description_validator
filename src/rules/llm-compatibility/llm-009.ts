/**
 * LLM-009: Include parameter constraints in description
 *
 * Validates that when a parameter has schema constraints (minimum, maximum,
 * maxLength, pattern, enum), those constraints are mentioned in the description.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

interface PropertySchema {
  description?: string;
  type?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  format?: string;
  [key: string]: unknown;
}

interface ConstraintCheck {
  schemaKey: keyof PropertySchema;
  descriptionPatterns: RegExp[];
  friendlyName: string;
}

const CONSTRAINT_CHECKS: ConstraintCheck[] = [
  {
    schemaKey: 'minimum',
    descriptionPatterns: [
      /\bmin(imum)?\b/i,
      /\bat\s+least\b/i,
      /\bgreater\s+than\b/i,
      /\b>=?\s*\d/i,
      /\bno\s+less\s+than\b/i,
      /\blower\s+bound\b/i,
    ],
    friendlyName: 'minimum value',
  },
  {
    schemaKey: 'maximum',
    descriptionPatterns: [
      /\bmax(imum)?\b/i,
      /\bat\s+most\b/i,
      /\bless\s+than\b/i,
      /\b<=?\s*\d/i,
      /\bno\s+more\s+than\b/i,
      /\bupper\s+bound\b/i,
      /\bup\s+to\b/i,
    ],
    friendlyName: 'maximum value',
  },
  {
    schemaKey: 'minLength',
    descriptionPatterns: [
      /\bmin(imum)?\s*(length|chars?|characters?)\b/i,
      /\bat\s+least\s+\d+\s*(chars?|characters?)\b/i,
      /\blength.{0,20}(at\s+least|min|>=)/i,
    ],
    friendlyName: 'minimum length',
  },
  {
    schemaKey: 'maxLength',
    descriptionPatterns: [
      /\bmax(imum)?\s*(\d+\s*)?(length|chars?|characters?)\b/i,
      /\bat\s+most\s+\d+\s*(chars?|characters?)\b/i,
      /\blength.{0,20}(at\s+most|max|<=|up\s+to)/i,
      /\bup\s+to\s+\d+\s*(chars?|characters?)\b/i,
      /\bno\s+more\s+than\s+\d+\s*(chars?|characters?)\b/i,
      /\btruncated?\b/i,
      /\blimit(ed)?\s+to\b/i,
    ],
    friendlyName: 'maximum length',
  },
  {
    schemaKey: 'pattern',
    descriptionPatterns: [
      /\bpattern\b/i,
      /\bformat\b/i,
      /\bregex\b/i,
      /\bmust\s+match\b/i,
      /\bshould\s+match\b/i,
      /\bvalid\b/i,
      /\blike\s+["'][^"']+["']/i,
      /\be\.?g\.?\s*["':]/i,
    ],
    friendlyName: 'format pattern',
  },
  {
    schemaKey: 'enum',
    descriptionPatterns: [
      /\bone\s+of\b/i,
      /\bmust\s+be\b/i,
      /\bshould\s+be\b/i,
      /\ballowed\s+values?\b/i,
      /\bvalid\s+values?\b/i,
      /\bpossible\s+values?\b/i,
      /\boptions?\s*(are|:)/i,
      /\b(can|may)\s+be\b/i,
      /['"][^'"]+['"](\s*,\s*['"][^'"]+['"]\s*(,|or|and))+/i, // List like "a", "b", or "c"
    ],
    friendlyName: 'allowed values',
  },
  {
    schemaKey: 'format',
    descriptionPatterns: [
      /\bformat\b/i,
      /\biso\s*\d*/i,
      /\brfc\s*\d+/i,
      /\buuid\b/i,
      /\buri\b/i,
      /\burl\b/i,
      /\bemail\b/i,
      /\bdate\b/i,
      /\btime\b/i,
      /\bdatetime\b/i,
      /\bhostname\b/i,
      /\bipv[46]?\b/i,
    ],
    friendlyName: 'format',
  },
];

const rule: Rule = {
  id: 'LLM-009',
  category: 'llm-compatibility',
  defaultSeverity: 'suggestion',
  description: 'Include parameter constraints in description (e.g., "max 100 characters")',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];

    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') {
      return issues;
    }

    const properties = schema.properties as Record<string, PropertySchema> | undefined;
    if (!properties || typeof properties !== 'object') {
      return issues;
    }

    for (const [paramName, paramSchema] of Object.entries(properties)) {
      if (!paramSchema || typeof paramSchema !== 'object') {
        continue;
      }

      const description = paramSchema.description;
      const descText = typeof description === 'string' ? description : '';

      const missingConstraints: string[] = [];

      for (const check of CONSTRAINT_CHECKS) {
        const constraintValue = paramSchema[check.schemaKey];

        // Skip if constraint is not defined
        if (constraintValue === undefined || constraintValue === null) {
          continue;
        }

        // Skip empty enums
        if (check.schemaKey === 'enum' && Array.isArray(constraintValue) && constraintValue.length === 0) {
          continue;
        }

        // Check if description mentions the constraint
        const mentionsConstraint = check.descriptionPatterns.some(pattern =>
          pattern.test(descText)
        );

        if (!mentionsConstraint) {
          missingConstraints.push(check.friendlyName);
        }
      }

      if (missingConstraints.length > 0) {
        const constraintList = missingConstraints.join(', ');
        issues.push({
          id: this.id,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Parameter '${paramName}' has schema constraints not mentioned in description: ${constraintList}`,
          tool: tool.name,
          path: `inputSchema.properties.${paramName}.description`,
          suggestion: `Document the constraints in the description (e.g., "max 100 characters", "must be one of: a, b, c")`,
        });
      }
    }

    return issues;
  },
};

export default rule;
