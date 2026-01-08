import type { ValidationResult } from '../types/index.js';

/**
 * Format validation results as JSON
 */
export function formatJsonOutput(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}
