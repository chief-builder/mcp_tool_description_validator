/**
 * BP-005: Tools with many parameters (>10) should be split
 *
 * Checks if tool has too many parameters, suggesting it should be split into smaller tools.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';

/**
 * Maximum recommended number of parameters.
 */
const MAX_PARAMETERS = 10;

const rule: Rule = {
  id: 'BP-005',
  category: 'best-practice',
  defaultSeverity: 'warning',
  description: 'Tools with many parameters (>10) should be split',

  check(tool) {
    const issues: ValidationIssue[] = [];

    const properties = tool.inputSchema?.properties;
    if (properties && typeof properties === 'object') {
      const paramCount = Object.keys(properties).length;

      if (paramCount > MAX_PARAMETERS) {
        issues.push({
          id: 'BP-005',
          category: 'best-practice',
          severity: this.defaultSeverity,
          message: `Tool has ${paramCount} parameters which exceeds the recommended limit of ${MAX_PARAMETERS}`,
          tool: tool.name,
          path: 'inputSchema.properties',
          suggestion:
            'Consider splitting this tool into multiple smaller, more focused tools',
        });
      }
    }

    return issues;
  },
};

export default rule;
