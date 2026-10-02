/**
 * SCH-011: Optional tool metadata must match the MCP Tool schema
 *
 * Validates the finalized 2026-07-28 shapes for top-level title, annotations,
 * and _meta. Icon fields are validated by BP-010.
 */

import type { Rule } from '../types.js';
import type { ValidationIssue } from '../../types/index.js';
import { isSchemaObject } from '../utils/schema-walker.js';

const BOOLEAN_HINTS = [
  'readOnlyHint',
  'destructiveHint',
  'idempotentHint',
  'openWorldHint',
] as const;

const rule: Rule = {
  id: 'SCH-011',
  category: 'schema',
  defaultSeverity: 'error',
  description: 'Optional tool metadata must match the MCP Tool schema',
  documentation:
    'https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool',

  check(tool, _ctx) {
    const issues: ValidationIssue[] = [];
    const raw = tool as unknown as Record<string, unknown>;

    const emit = (path: string, message: string, suggestion: string): void => {
      issues.push({
        id: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        message,
        tool: typeof tool.name === 'string' ? tool.name : '(unnamed)',
        path,
        suggestion,
        documentation: this.documentation,
      });
    };

    if (raw.title !== undefined && typeof raw.title !== 'string') {
      emit(
        'title',
        'Tool "title" must be a string when provided',
        'Use a human-readable string title or remove the field'
      );
    }

    if (raw.annotations !== undefined) {
      if (!isSchemaObject(raw.annotations)) {
        emit(
          'annotations',
          'Tool "annotations" must be an object when provided',
          'Provide an annotations object or remove the field'
        );
      } else {
        if (
          raw.annotations.title !== undefined &&
          typeof raw.annotations.title !== 'string'
        ) {
          emit(
            'annotations.title',
            'annotations.title must be a string when provided',
            'Use a human-readable string title or remove the field'
          );
        }

        for (const hint of BOOLEAN_HINTS) {
          if (
            raw.annotations[hint] !== undefined &&
            typeof raw.annotations[hint] !== 'boolean'
          ) {
            emit(
              `annotations.${hint}`,
              `annotations.${hint} must be a boolean when provided`,
              `Set annotations.${hint} to true or false`
            );
          }
        }
      }
    }

    if (raw._meta !== undefined && !isSchemaObject(raw._meta)) {
      emit(
        '_meta',
        'Tool "_meta" must be an object when provided',
        'Provide a metadata object or remove the field'
      );
    }

    return issues;
  },
};

export default rule;
