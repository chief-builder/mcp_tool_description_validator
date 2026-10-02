/**
 * Naming Rules Barrel Export
 *
 * Exports all naming convention validation rules.
 */

import type { Rule } from '../types.js';

import nam002 from './nam-002.js';
import nam003 from './nam-003.js';
import nam004 from './nam-004.js';
import nam005 from './nam-005.js';
import nam006 from './nam-006.js';
import nam007 from './nam-007.js';
import nam008 from './nam-008.js';

export { nam002, nam003, nam004, nam005, nam006, nam007, nam008 };

/**
 * All naming rules as an array.
 */
export const namingRules: Rule[] = [
  nam002,
  nam003,
  nam004,
  nam005,
  nam006,
  nam007,
  nam008,
];

export default namingRules;
