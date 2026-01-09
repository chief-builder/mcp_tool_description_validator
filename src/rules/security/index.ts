/**
 * Security Rules (SEC-*)
 *
 * Rules for detecting security vulnerabilities and input validation gaps.
 */

import type { Rule } from '../types.js';

import sec001 from './sec-001.js';
import sec002 from './sec-002.js';
import sec003 from './sec-003.js';
import sec004 from './sec-004.js';
import sec005 from './sec-005.js';
import sec006 from './sec-006.js';
import sec007 from './sec-007.js';
import sec008 from './sec-008.js';
import sec009 from './sec-009.js';
import sec010 from './sec-010.js';

export {
  sec001,
  sec002,
  sec003,
  sec004,
  sec005,
  sec006,
  sec007,
  sec008,
  sec009,
  sec010,
};

// Re-export helper function for cross-rule use
export { isSensitiveParameter } from './sec-007.js';

/**
 * All security rules as an array.
 */
export const securityRules: Rule[] = [
  sec001,
  sec002,
  sec003,
  sec004,
  sec005,
  sec006,
  sec007,
  sec008,
  sec009,
  sec010,
];

export default securityRules;
