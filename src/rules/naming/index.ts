/**
 * Naming Rules Barrel Export
 *
 * Exports all naming convention validation rules.
 */

import type { Rule } from '../types.js';

import nam001 from './nam-001.js';
import nam002 from './nam-002.js';
import nam003 from './nam-003.js';
import nam004 from './nam-004.js';
import nam005 from './nam-005.js';
import nam006 from './nam-006.js';

export {
  nam001,
  nam002,
  nam003,
  nam004,
  nam005,
  nam006,
};

/**
 * All naming rules as an array.
 */
export const namingRules: Rule[] = [
  nam001,
  nam002,
  nam003,
  nam004,
  nam005,
  nam006,
];

export default namingRules;
